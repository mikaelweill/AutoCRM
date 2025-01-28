import { ChatOpenAI } from '@langchain/openai'
import { AgentExecutor, createOpenAIToolsAgent } from 'langchain/agents'
import { Tool } from '@langchain/core/tools'
import { ChatPromptTemplate } from '@langchain/core/prompts'
import { MessageType, MessageClassification, AgentResponse } from './types'
import { LangChainTracer } from 'langchain/callbacks'
import { BaseCallbackHandler } from '@langchain/core/callbacks/base'
import { v4 as uuidv4 } from 'uuid'

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
  description = 'Search knowledge base, past tickets, and documentation. Input should be a search query string.'

  async _call(query: string): Promise<string> {
    try {
      // For now, just return a structured response about no results
      return JSON.stringify({
        status: 'no_results',
        message: 'I searched for tickets and documentation related to your query but found no exact matches. Please try rephrasing your search or provide more specific details about what you\'re looking for.'
      })
    } catch (error) {
      console.error('Error in RAGTool:', error)
      return JSON.stringify({
        status: 'error',
        message: 'I encountered an error while searching. Please try again or rephrase your query.'
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
      ["system", `You are a helpful customer service AI assistant with access to two tools:
      1. 'search' - Use this tool to search through knowledge base, past tickets, and documentation
      2. 'ticket' - Use this tool for ticket operations like update and assign

      For any questions about tickets, customers, or documentation, ALWAYS use the appropriate tool.
      For example:
      - If asked about a specific ticket or customer, use the 'search' tool
      - If asked to update or modify a ticket, use the 'ticket' tool
      
      Format your responses professionally and clearly.
      If a tool returns an error or no results, explain this to the user.`],
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