import { ChatOpenAI } from '@langchain/openai'
import { AgentExecutor, createOpenAIToolsAgent } from 'langchain/agents'
import { Tool } from '@langchain/core/tools'
import { ChatPromptTemplate } from '@langchain/core/prompts'
import { MessageType, MessageClassification, AgentResponse } from './types'
import { LangChainTracer } from 'langchain/callbacks'

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
  description = 'Search knowledge base, past tickets, and documentation'

  async _call(arg: string): Promise<string> {
    // Implementation coming soon
    return 'Search completed'
  }
}

// Create and export our agent setup function
export async function createAssistantAgent() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not configured')
  }

  try {
    // Initialize tracer
    const tracer = new LangChainTracer()
    
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
      ["system", `You are a helpful customer service AI assistant.
      You can engage in general conversation, search for information,
      and perform ticket operations. Always be professional and clear.
      If you need to perform actions, use the appropriate tools.`],
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
      callbacks: [tracer],  // Use the LangChain tracer
    })
  } catch (error) {
    console.error('Error creating assistant agent:', error)
    throw error
  }
}

// Helper function to process messages
export async function processMessage(content: string): Promise<AgentResponse> {
  try {
    console.log('Creating assistant agent...')
    const agent = await createAssistantAgent()
    
    console.log('Invoking agent with content:', content)
    const result = await agent.invoke({ input: content })
    console.log('Agent result:', result)

    // Get the run ID from the tracer
    const runId = result.runId || undefined
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