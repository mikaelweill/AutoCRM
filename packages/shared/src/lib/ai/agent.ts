import { ChatOpenAI } from '@langchain/openai'
import { AgentExecutor, createOpenAIToolsAgent } from 'langchain/agents'
import { Tool } from '@langchain/core/tools'
import { ChatPromptTemplate } from '@langchain/core/prompts'
import { MessageType, AgentResponse } from './types'
import { LangChainTracer } from 'langchain/callbacks'
import { BaseCallbackHandler } from '@langchain/core/callbacks/base'
import { v4 as uuidv4 } from 'uuid'
import { performRAGSearch } from './rag'
import { z } from 'zod'
import { ticketActionService, TicketStatus, TicketPriority } from './ticket_action'


// Define our tools
class TicketTool extends Tool {
  name = 'ticket'
  private agentId: string
  private static lastProcessedComments = new Map<string, number>()

  constructor(agentId: string) {
    super()
    this.agentId = agentId
  }

  description = `Manage ticket operations. Commands should be in natural language.
Examples:
- "tell me about ticket #123"
- "what is the status of ticket #456"
- "assign ticket #123 to me"
- "close ticket #456"
- "open ticket #789"
- "mark ticket #456 as resolved"
- "set priority of ticket #789 to high"
- "add comment to ticket #234: Customer issue has been fixed"
- "add internal note to ticket #567: Following up with engineering"
- "unassign ticket #890"

The tool will handle:
- Ticket lookups and status checks
- Ticket assignment (self only)
- Direct status commands (close, open, reopen)
- Status updates with valid transitions:
  * new → in_progress, cancelled
  * in_progress → cancelled, closed
  * resolved → closed, in_progress
  * closed → in_progress
  * cancelled → in_progress
- Priority updates (low, medium, high, urgent)
- Adding comments (public or internal)
- Unassigning tickets

Note: To close a ticket, it must be in 'in_progress' status first.`

  schema = z.object({
    input: z.string().optional().describe('Natural language command')
  }).transform(obj => obj.input)

  async _call(input: string): Promise<string> {
    try {
      // Use the command directly, no need to parse JSON anymore
      const command = input
      const currentAgentId = this.agentId

      // Extract ticket number from command
      const ticketMatch = command.match(/#?(\d+)/)
      if (!ticketMatch) {
        return JSON.stringify({
          success: false,
          error: 'No ticket number found in command. Please specify a ticket number (e.g., #123)'
        })
      }
      const ticketNumber = parseInt(ticketMatch[1])

      // Check for lookup/info requests first
      if (command.match(/tell|about|show|get|what|content|info|details|status|look up/i)) {
        const ticketContent = await ticketActionService.getTicketContent(ticketNumber)
        if (!ticketContent) {
          return JSON.stringify({
            success: false,
            error: `Ticket #${ticketNumber} not found`
          })
        }
        
        return JSON.stringify({
          success: true,
          data: ticketContent
        })
      }

      // For other operations, validate ticket exists
      const ticketExists = await ticketActionService.validateTicket(ticketNumber)
      if (!ticketExists) {
        return JSON.stringify({
          success: false,
          error: `Ticket #${ticketNumber} not found`
        })
      }

      // Handle different command types
      if (command.match(/assign.*to me/i)) {
        const result = await ticketActionService.assignToMe(ticketNumber, currentAgentId)
        return JSON.stringify(result)
      }

      if (command.match(/unassign/i)) {
        const result = await ticketActionService.unassignTicket(ticketNumber, currentAgentId)
        return JSON.stringify(result)
      }

      // Check for direct status commands first
      if (command.match(/close ticket|close #/i)) {
        const result = await ticketActionService.updateStatus(
          ticketNumber,
          'closed' as TicketStatus,
          currentAgentId
        )
        return JSON.stringify(result)
      }

      if (command.match(/open ticket|open #|reopen ticket|reopen #/i)) {
        const result = await ticketActionService.updateStatus(
          ticketNumber,
          'in_progress' as TicketStatus,
          currentAgentId
        )
        return JSON.stringify(result)
      }

      // Then check for general status update commands
      if (command.match(/mark.*as|set.*status|change.*status/i)) {
        const statusMatch = command.match(/as\s+(\w+)|status\s+(?:to\s+)?(\w+)/i)
        if (!statusMatch) {
          return JSON.stringify({
            success: false,
            error: 'No status specified. Valid statuses are: new, in_progress, resolved, closed, cancelled'
          })
        }
        const status = (statusMatch[1] || statusMatch[2]).toLowerCase()
        if (!['new', 'in_progress', 'resolved', 'closed', 'cancelled'].includes(status)) {
          return JSON.stringify({
            success: false,
            error: 'Invalid status. Valid statuses are: new, in_progress, resolved, closed, cancelled'
          })
        }

        // Get current ticket status first
        const ticketContent = await ticketActionService.getTicketContent(ticketNumber)
        if (!ticketContent) {
          return JSON.stringify({
            success: false,
            error: `Ticket #${ticketNumber} not found`
          })
        }

        // If trying to close and not in_progress, try to transition to in_progress first
        if (status === 'closed' && ticketContent.currentStatus !== 'in_progress') {
          const transitionResult = await ticketActionService.updateStatus(
            ticketNumber,
            'in_progress' as TicketStatus,
            currentAgentId
          )
          if (!transitionResult.success) {
            return JSON.stringify({
              success: false,
              error: `Cannot close ticket. First transition to in_progress failed: ${transitionResult.message}`
            })
          }
        }

        const result = await ticketActionService.updateStatus(
          ticketNumber,
          status as TicketStatus,
          currentAgentId
        )
        return JSON.stringify(result)
      }

      if (command.match(/priority/i)) {
        const priorityMatch = command.match(/priority\s+(?:to\s+)?(\w+)/i)
        if (!priorityMatch) {
          return JSON.stringify({
            success: false,
            error: 'No priority specified. Valid priorities are: low, medium, high, urgent'
          })
        }
        const priority = priorityMatch[1].toLowerCase()
        if (!['low', 'medium', 'high', 'urgent'].includes(priority)) {
          return JSON.stringify({
            success: false,
            error: 'Invalid priority. Valid priorities are: low, medium, high, urgent'
          })
        }
        const result = await ticketActionService.updatePriority(
          ticketNumber,
          priority as TicketPriority,
          currentAgentId
        )
        return JSON.stringify(result)
      }

      if (command.match(/add.*(?:internal note|comment)/i)) {
        const isInternal = command.includes('internal')
        const contentMatch = command.match(/:\s*(.+)$/)
        if (!contentMatch) {
          return JSON.stringify({
            success: false,
            error: 'No comment content provided. Format should be: "add comment to ticket #123: Your comment here"'
          })
        }
        const content = contentMatch[1].trim()
        
        // Prevent duplicate comment creation by checking if we've already processed this exact comment
        const commentKey = `${ticketNumber}-${content}`
        const now = Date.now()
        const lastProcessed = TicketTool.lastProcessedComments.get(commentKey)
        
        // If we've processed this exact comment in the last 5 seconds, skip it
        if (lastProcessed && now - lastProcessed < 5000) {
          return JSON.stringify({
            success: true,
            message: 'Comment already processed'
          })
        }
        
        // Store this comment with its timestamp
        TicketTool.lastProcessedComments.set(commentKey, now)
        
        // Clean up old entries (older than 1 minute)
        Array.from(TicketTool.lastProcessedComments.entries()).forEach(([key, timestamp]) => {
          if (now - timestamp > 60000) {
            TicketTool.lastProcessedComments.delete(key)
          }
        })

        const result = await ticketActionService.addComment(
          ticketNumber,
          content,
          currentAgentId,
          isInternal
        )
        return JSON.stringify(result)
      }

      return JSON.stringify({
        success: false,
        error: 'Unrecognized command. Please check the tool description for supported commands.'
      })

    } catch (error) {
      console.error('Error in TicketTool:', error)
      return JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'An unknown error occurred'
      })
    }
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
export async function createAssistantAgent(
  tracer: LangChainTracer,
  agentId: string,
  runId?: string
) {
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

    // Setup our toolkit with agentId
    console.log('Setting up toolkit...')
    const toolkit = [
      new TicketTool(agentId),
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
export async function processMessage(content: string, agentId: string): Promise<AgentResponse> {
  try {
    console.log('Creating assistant agent...')
    const runId = uuidv4()
    console.log('Generated Run ID:', runId)

    const tracer = new LangChainTracer({
      projectName: process.env.LANGCHAIN_PROJECT || "autocrm"
    })

    const agent = await createAssistantAgent(tracer, agentId, runId)
    
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