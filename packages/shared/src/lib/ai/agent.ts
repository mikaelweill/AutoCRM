import { ChatOpenAI } from '@langchain/openai'
import { AgentExecutor, createOpenAIToolsAgent } from 'langchain/agents'
import { Tool } from '@langchain/core/tools'
import { ChatPromptTemplate } from '@langchain/core/prompts'
import { MessageType, MessageClassification, AgentResponse } from './types'
import { LangChainTracer } from 'langchain/callbacks'
import { BaseCallbackHandler } from '@langchain/core/callbacks/base'
import { v4 as uuidv4 } from 'uuid'
import { performRAGSearch } from './rag'
import { z } from 'zod'

// Define our tool interfaces
interface ToolResult {
  success: boolean
  data?: any
  error?: string
}

// Define our tools
class TicketTool extends Tool {
  name = 'ticket'
  description = 'Manage ticket operations like update, assign, etc.'

  async _call(arg: string): Promise<string> {
    // Implementation coming soon
    return 'Ticket operation completed'
  }
}

class RAGTool extends Tool {
  name = 'search'
  description = `Search knowledge base and tickets. Provide your search query as a string.
For simple search, just provide your query:
  "how to handle password reset"

For searching with a ticket number, use this format:
  "ticket:123 find similar issues"

The tool will return:
- Similar tickets (with number, subject, description, status, priority)
- Knowledge base articles (with title, content, category)
- Similarity scores (0-1) indicating relevance`

  schema = z.object({
    input: z.string().optional().describe('Search query, optionally prefixed with ticket:NUMBER for ticket-based search')
  }).transform((obj) => obj.input)

  async _call(input: string): Promise<string> {
    try {
      // Parse input for ticket number if present
      const ticketMatch = input.match(/^ticket:(\d+)\s+(.+)$/);
      const searchParams = ticketMatch
        ? {
            searchQuery: ticketMatch[2],
            ticketNumber: parseInt(ticketMatch[1])
          }
        : { searchQuery: input };

      const results = await performRAGSearch(searchParams);
      
      // Format the results in a way that's useful for the agent
      const response = {
        status: 'success',
        function_called: searchParams.ticketNumber ? 'search_with_ticket' : 'search_by_query',
        parameters: searchParams,
        similarTickets: results.similarTickets.map(ticket => ({
          number: ticket.number,
          subject: ticket.subject,
          description: ticket.description,
          status: ticket.status,
          priority: ticket.priority,
          similarity: ticket.similarity,
          activities: ticket.activities?.map((activity: { 
            content: string;
            created_at: string;
            activity_type: string;
            is_internal: boolean;
            user: {
              email: string;
              full_name: string;
            }
          }) => ({
            content: activity.content,
            created_at: activity.created_at,
            activity_type: activity.activity_type,
            is_internal: activity.is_internal,
            user: {
              email: activity.user.email,
              full_name: activity.user.full_name
            }
          }))
        })),
        knowledgeBase: results.knowledgeBase.map(article => ({
          title: article.title,
          content: article.content,
          category: article.category,
          similarity: article.similarity
        }))
      };

      // If no results found
      if (response.similarTickets.length === 0 && response.knowledgeBase.length === 0) {
        return JSON.stringify({
          status: 'no_results',
          function_called: response.function_called,
          parameters: response.parameters,
          message: searchParams.ticketNumber 
            ? `No matches found for content similar to ticket #${searchParams.ticketNumber}. Try a different ticket or a more general search.`
            : 'No matches found for your search. Try rephrasing or using different terms.'
        });
      }

      return JSON.stringify(response);
    } catch (error) {
      console.error('Error in RAGTool:', error)
      return JSON.stringify({
        status: 'error',
        message: 'Search failed. Please try again or rephrase your query.'
      })
    }
  }
}

// Create and export our agent setup function
export async function createAssistantAgent(tracer: LangChainTracer, runId?: string) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not configured')
  }

  try {
    // Initialize the LLM
    console.log('Initializing LLM...')
    const llm = new ChatOpenAI({
      modelName: "gpt-4o-mini",
      temperature: 0,
      openAIApiKey: process.env.OPENAI_API_KEY
    })

    // Setup our toolkit
    console.log('Setting up toolkit...')
    const toolkit = [
      new TicketTool(),
      new RAGTool(),
    ]

    // Create our prompt template
    console.log('Creating prompt template...')
    const prompt = ChatPromptTemplate.fromMessages([
      ["system", `You are a helpful and friendly customer service AI assistant. Your goal is to have natural conversations while helping solve problems.

Key guidelines:
- Be conversational and natural in your responses
- Only mention information that is directly relevant to the user's question
- Focus on having a dialogue rather than delivering a report

RAG Search Guidelines:
You MUST use the 'search' tool for:
- Any content-related questions (movies, shows, articles)
- Support inquiries
- Knowledge base lookups
- Historical ticket information
- Policy/procedure questions
- Product information

You MAY use the 'search' tool for:
- Ticket editing operations (use your judgment)
- Direct system commands
- Clarification questions

Do NOT use the 'search' tool for:
- Basic greetings
- Simple confirmations
- Syntax questions
- Direct commands
- Questions about current conversation

When using search results:
- Never dump raw search results
- Synthesize information into natural, conversational responses
- If results are unclear or unhelpful, acknowledge this directly
- Only include relevant information that answers the user's question
- If multiple sources found, combine them coherently

For example, instead of:
"Here are the ticket details:
- Number: 123
- Status: Open
- Priority: High"

Say something like:
"I found the ticket about the login issue you mentioned. The customer reported they couldn't access their account yesterday, and our support team responded with..."

Remember: You're having a conversation, not writing a formal report.`],
      ["human", "{input}"],
      ["assistant", "{agent_scratchpad}"]
    ])

    // Create the agent
    console.log('Creating agent...')
    const agent = await createOpenAIToolsAgent({
      llm,
      tools: toolkit,
      prompt,
    })

    // Create and return the executor
    console.log('Creating executor...')
    return AgentExecutor.fromAgentAndTools({
      agent,
      tools: toolkit,
      callbacks: [tracer],
      tags: runId ? ["autocrm", runId] : ["autocrm"]
    })
  } catch (error) {
    console.error('Error creating assistant agent:', error)
    throw error
  }
}

// Custom callback handler to ensure our run ID is used
class RunIDHandler extends BaseCallbackHandler {
  name = "run_id_handler"
  runId: string

  constructor(runId: string) {
    super()
    this.runId = runId
  }

  async handleChainStart() {
    return {
      runId: this.runId,
      name: "Agent Interaction"
    }
  }
}

// Helper function to process messages
export async function processMessage(content: string): Promise<AgentResponse> {
  try {
    console.log('Creating assistant agent...')
    const runId = uuidv4()
    console.log('Generated Run ID:', runId)

    const tracer = new LangChainTracer({
      projectName: process.env.LANGCHAIN_PROJECT || "autocrm"
    })

    const agent = await createAssistantAgent(tracer, runId)
    
    console.log('Invoking agent with content:', content)
    const result = await agent.invoke({ 
      input: content,
      callbacks: [tracer],
      tags: ["autocrm", runId]
    })
    console.log('Agent result:', result)
    console.log('Run ID:', runId)

    // Transform the result into our AgentResponse type
    return {
      content: result.output,
      type: determineMessageType(result),
      sources: [],  // We'll add these later
      actions: [],  // We'll add these later
      trace_id: runId
    }
  } catch (error) {
    console.error('Error in processMessage:', error)
    if (error instanceof Error) {
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      })
    }
    return {
      content: "I apologize, but I'm having trouble processing your message right now. Please try again in a moment.",
      type: 'chat',
      sources: [],
      actions: [],
      trace_id: undefined
    }
  }
}

// Helper to determine message type from result
function determineMessageType(result: any): MessageType {
  // Implementation coming soon
  return 'chat'
} 