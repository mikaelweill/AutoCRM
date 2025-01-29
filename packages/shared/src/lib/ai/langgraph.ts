import { Tool } from '@langchain/core/tools'
import { MessageType, MessageClassification, AgentResponse } from './types'
import { LangChainTracer } from 'langchain/callbacks'
import { BaseCallbackHandler } from '@langchain/core/callbacks/base'
import { v4 as uuidv4 } from 'uuid'
import { performRAGSearch, RAGQuery } from './rag'
import { Database } from '../../types/database'
import { ticketActionService } from './ticket_action'

type TicketStatus = Database['public']['Enums']['ticket_status']
type TicketPriority = Database['public']['Enums']['ticket_priority']
type ActivityType = Database['public']['Enums']['activity_type']

// Define activity interface
interface TicketActivity {
  content: string
  created_at: string
  activity_type: string
  is_internal: boolean
  user: {
    email: string
    full_name: string
  }
}

// Enhanced tracer for graph execution
class GraphTracer {
  private langchainTracer: LangChainTracer
  private runId: string
  private tags: string[]
  private activeChains: Map<string, boolean>
  private parentRunId?: string

  constructor(
    runId: string,
    projectName: string = process.env.LANGCHAIN_PROJECT || "autocrm",
    parentRunId?: string
  ) {
    if (!process.env.LANGCHAIN_API_KEY) {
      throw new Error('LANGCHAIN_API_KEY is not configured')
    }

    this.runId = runId
    this.parentRunId = parentRunId
    this.tags = ["autocrm", runId]
    
    // Initialize LangChain tracer with proper configuration
    this.langchainTracer = new LangChainTracer({
      projectName,
      exampleId: runId
    })
    this.activeChains = new Map()
  }

  // Add public getter for runId
  getRunId(): string {
    return this.runId
  }

  async logEvent(type: string, data: any) {
    const eventId = this.runId
    this.activeChains.set(eventId, true)

    const serializedData = {
      lc: 1,
      type: "not_implemented" as const,
      id: [this.runId],
      name: type,
      metadata: { 
        type, 
        data,
        parent_run_id: this.parentRunId 
      }
    }

    // Log to LangChain with proper chain format
    await this.langchainTracer.handleChainStart(
      serializedData,
      {
        input_variables: ["input"],
        kwargs: { input: JSON.stringify(data) }
      },
      eventId,
      this.parentRunId,
      this.tags
    )

    // Also log to console for debugging
    console.log({
      type,
      data,
      runId: this.runId,
      parentRunId: this.parentRunId,
      timestamp: new Date().toISOString(),
      tags: this.tags
    })
  }

  async logNodeExecution(nodeName: string, input: any, output: any) {
    const chainId = this.runId
    
    // Only end if we have an active chain
    if (this.activeChains.get(chainId)) {
    const serializedData = {
      lc: 1,
      type: "not_implemented" as const,
        id: [this.runId],
      name: nodeName,
        metadata: { 
          input, 
          output,
          node_type: nodeName,
          parent_run_id: this.parentRunId
        }
      }

      // End the chain with proper completion data
    await this.langchainTracer.handleChainEnd(
      serializedData,
        chainId
    )
      
      this.activeChains.delete(chainId)
    }
  }

  async logError(error: any) {
    // End all active chains with error
    const activeChainIds = Array.from(this.activeChains.keys())
    for (const chainId of activeChainIds) {
      const errorData = {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        code: error instanceof Error ? (error as any).code : undefined
      }

    await this.langchainTracer.handleChainError(
        errorData,
        chainId
    )
      this.activeChains.delete(chainId)
    }
  }

  getCallbacks() {
    return [this.langchainTracer]
  }

  // Create a child tracer for sub-operations
  createChildTracer(childRunId: string): GraphTracer {
    return new GraphTracer(
      childRunId,
      process.env.LANGCHAIN_PROJECT || "autocrm",
      this.runId // Pass current runId as parent
    )
  }
}

// Make tools private to the graph implementation
class TicketTool extends Tool {
  name = 'ticket'
  description = `Manage ticket operations. Commands should be in natural language.
Examples:
- "assign ticket #123 to me"
- "mark ticket #456 as resolved"
- "set priority of ticket #789 to high"
- "add comment to ticket #234: Customer issue has been fixed"
- "add internal note to ticket #567: Following up with engineering"
- "unassign ticket #890"
- "what is the content of ticket #123"
- "get question from ticket #456"

The tool will handle:
- Ticket assignment (self only)
- Status updates (new, in_progress, resolved, closed, cancelled)
- Priority updates (low, medium, high, urgent)
- Adding comments (public or internal)
- Unassigning tickets
- Retrieving ticket content and questions`

  private agentId: string
  private static lastProcessedComments = new Map<string, number>()

  constructor(agentId: string) {
    super()
    this.agentId = agentId
  }

  async _call(input: string): Promise<string> {
    try {
      // Use the command directly, no need to parse JSON anymore
      const command = input
      const currentAgentId = this.agentId

      // Extract ticket number from command
      const ticketMatch = command.match(/#(\d+)/)
      if (!ticketMatch) {
        return JSON.stringify({
          success: false,
          error: 'No ticket number found in command. Please specify a ticket number (e.g., #123)'
        })
      }
      const ticketNumber = parseInt(ticketMatch[1])

      // Check for content/question retrieval requests
      if (command.match(/what|content|question|get.*question|get.*content/i)) {
        const ticketContent = await ticketActionService.getTicketContent(ticketNumber)
        if (!ticketContent) {
          return JSON.stringify({
            success: false,
            error: `Ticket #${ticketNumber} not found`
          })
        }
        
        return JSON.stringify({
          success: true,
          data: {
            id: ticketContent.id,
            subject: ticketContent.subject,
            description: ticketContent.description,
            status: ticketContent.currentStatus,
            number: ticketContent.number,
            currentAgentId: ticketContent.currentAgentId
          }
        })
      }

      // Validate ticket exists
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
  description = `Tool for searching knowledge base and tickets. Use one of these function formats:

1. search_by_query("your search query")
   Use when: You want to search across all content
   Example: You will need to say "search_by_query("how to handle password reset")"

2. search_with_ticket(ticket_number, "your search query")
   Use when: You want to find content similar to a specific ticket
   Example: you will need to say "search_with_ticket(123, "find similar issues")"

  So to summarize you will not only need to pass the input but call the function with the input inside.

The tool will return:
- Similar tickets (with number, subject, description, status, priority)
- Knowledge base articles (with title, content, category)
- Similarity scores (0-1) indicating relevance

Always format calls exactly as shown in the examples above.`

  async _call(input: string): Promise<string> {
    try {
      // Parse the structured input
      const searchByTicketMatch = input.match(/search_with_ticket\((\d+),\s*"([^"]+)"\)/);
      const searchByQueryMatch = input.match(/search_by_query\("([^"]+)"\)/);

      let ticketNumber: number | undefined;
      let searchQuery: string;

      if (searchByTicketMatch) {
        ticketNumber = parseInt(searchByTicketMatch[1]);
        searchQuery = searchByTicketMatch[2];
      } else if (searchByQueryMatch) {
        searchQuery = searchByQueryMatch[1];
      } else {
        return JSON.stringify({
          status: 'error',
          message: 'Invalid function call format. Please use either search_by_query("query") or search_with_ticket(number, "query")'
        });
      }

      const results = await performRAGSearch({ 
        ticketNumber,
        searchQuery
      });
      
      // Format the results in a way that's useful for the agent
      const response = {
        status: 'success',
        function_called: ticketNumber ? 'search_with_ticket' : 'search_by_query',
        parameters: {
          ticketNumber,
          searchQuery
        },
        similarTickets: results.similarTickets.map(ticket => ({
          number: ticket.number,
          subject: ticket.subject,
          description: ticket.description,
          status: ticket.status,
          priority: ticket.priority,
          similarity: ticket.similarity
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
          message: ticketNumber 
            ? `No matches found for content similar to ticket #${ticketNumber}. Try a different ticket or a more general search.`
            : 'No matches found for your search. Try rephrasing or using different terms.'
        });
      }

      return JSON.stringify(response);
    } catch (error) {
      console.error('Error in RAGTool:', error)
      return JSON.stringify({
        status: 'error',
        message: 'Search failed. Please try again.'
      })
    }
  }
}

// Define core interfaces
interface ExecutionContext {
  message: string
  agentId: string
  sessionId: string
  tools: {
    rag: RAGTool
    ticket: TicketTool
  }
  parallelResults?: Map<string, NodeResult<any>>
  metadata?: Record<string, any>
}

interface NodeResult<T> {
  success: boolean
  output: T
  error?: string
  metadata: {
    nextNode?: string
    requiresParallel?: boolean
    confidence: number
  }
}

// Core node types
interface NodeInput {
  message: string
  ticketNumber?: number
  action?: string
  needsRAG?: boolean
  needsAction?: boolean
}

interface NodeOutput {
  content: string
  ticketInfo?: any
  ragResults?: any[]
  success: boolean
  error?: string
}

// Simplified base node
abstract class BaseNode {
  abstract process(input: NodeInput, context: ExecutionContext): Promise<NodeOutput>
}

// Main processor node - handles routing and execution
class ProcessorNode extends BaseNode {
  async process(input: NodeInput, context: ExecutionContext): Promise<NodeOutput> {
    try {
      // 1. Parse intent
      const intent = this.classifyIntent(input.message)
      
      // 2. Get ticket info if needed
      let ticketInfo
      if (input.ticketNumber) {
        const ticketResult = await context.tools.ticket._call(`what is the content of ticket #${input.ticketNumber}`)
        ticketInfo = JSON.parse(ticketResult)
        if (!ticketInfo.success) {
    return {
            content: ticketInfo.error || `Ticket #${input.ticketNumber} not found`,
            success: false,
            error: ticketInfo.error
          }
        }
      }

      // 3. Handle RAG if needed
      let ragResults
      if (intent.needsRAG) {
        const searchQuery = input.ticketNumber 
          ? `search_with_ticket(${input.ticketNumber}, "${input.message}")` 
          : `search_by_query("${input.message}")`
        const ragResult = await context.tools.rag._call(searchQuery)
        ragResults = JSON.parse(ragResult)
      }

      // 4. Handle actions if needed
      if (intent.action) {
        const actionResult = await context.tools.ticket._call(this.buildActionCommand(intent.action, input.ticketNumber))
        const actionResponse = JSON.parse(actionResult)
        if (!actionResponse.success) {
    return {
            content: actionResponse.error || 'Action failed',
            success: false,
            error: actionResponse.error
          }
        }
      }

      // 5. Build response
      return this.buildResponse(ticketInfo, ragResults, intent)
    } catch (error) {
      console.error('Error in ProcessorNode:', error)
    return {
        content: 'I encountered an error processing your request.',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  private classifyIntent(message: string): { 
    needsRAG: boolean
    action?: string 
  } {
    const msg = message.toLowerCase()
    return {
      needsRAG: msg.includes('similar') || 
                msg.includes('like') || 
                msg.includes('policy') ||
                msg.includes('how to') ||
                msg.includes('what should'),
      action: msg.includes('assign') ? 'assign' :
              msg.includes('unassign') ? 'unassign' :
              msg.includes('close') ? 'close' :
              undefined
    }
  }

  private buildActionCommand(action: string, ticketNumber?: number): string {
    if (!ticketNumber) return ''
    switch (action) {
      case 'assign':
        return `assign ticket #${ticketNumber} to me`
      case 'unassign':
        return `unassign ticket #${ticketNumber}`
      case 'close':
        return `mark ticket #${ticketNumber} as closed`
      default:
        return ''
    }
  }

  private buildResponse(ticketInfo?: any, ragResults?: any, intent?: { needsRAG: boolean, action?: string }): NodeOutput {
    let content = ''
    
    // Start with ticket info if available
    if (ticketInfo?.success) {
      const ticket = ticketInfo.data
      const statusPhrase = ticket.status === 'in_progress' ? "is being worked on" : 
                          ticket.status === 'new' ? "is waiting to be assigned" :
                          ticket.status === 'closed' ? "has been resolved" : 
                          `is marked as ${ticket.status}`
      
      content = `Ticket #${ticket.number} is about "${ticket.subject}". The ticket ${statusPhrase}.\n\n`
      content += `Description: ${ticket.description}\n\n`
    }

    // Add RAG results if available
    if (ragResults?.similarTickets?.length > 0 || ragResults?.knowledgeBase?.length > 0) {
      content += "Here's what I found:\n\n"
      
      // Add knowledge base results first
      ragResults.knowledgeBase?.slice(0, 2).forEach((article: any) => {
        if (article.similarity > 0.4) {
          content += `From our knowledge base (${article.category}): ${article.content}\n\n`
        }
      })

      // Add similar tickets
      ragResults.similarTickets?.slice(0, 2).forEach((ticket: any) => {
        if (ticket.similarity > 0.3) {
          content += `Similar ticket #${ticket.number}: ${ticket.subject}\n`
        }
      })
    }

    return {
      content: content.trim(),
      ticketInfo: ticketInfo?.data,
      ragResults: ragResults?.similarTickets,
      success: true
    }
  }
}

// Simplified executor
export class ChatGraphExecutor {
  private tools: { rag: RAGTool; ticket: TicketTool }
  private processor: ProcessorNode

  constructor() {
    this.tools = {
      rag: new RAGTool(),
      ticket: new TicketTool(uuidv4())
    }
    this.processor = new ProcessorNode()
  }

  private buildSources(result: NodeOutput): Array<{type: 'ticket' | 'kb' | 'doc', id: string, title: string, excerpt: string}> {
    const sources: Array<{type: 'ticket' | 'kb' | 'doc', id: string, title: string, excerpt: string}> = []
    
    if (result.ticketInfo) {
      sources.push({ 
        type: 'ticket', 
        id: result.ticketInfo.id, 
        title: result.ticketInfo.subject || '',
        excerpt: result.ticketInfo.description || ''
      })
    }
    
    if (result.ragResults) {
      result.ragResults.forEach((result: any) => {
        sources.push({ 
          type: 'ticket', 
          id: result.id, 
          title: result.subject || '',
          excerpt: result.description || ''
        })
      })
    }

    return sources
  }

  async execute(message: string, agentId: string): Promise<AgentResponse> {
    try {
      // Extract ticket number if present
      const ticketMatch = message.match(/(?:ticket\s+|#)(\d+)/i)
      const ticketNumber = ticketMatch ? parseInt(ticketMatch[1]) : undefined

      const context: ExecutionContext = {
        message,
        agentId,
        sessionId: uuidv4(),
        tools: this.tools
      }

      const result = await this.processor.process({ message, ticketNumber }, context)

      return {
        content: result.content,
        type: 'chat',
        sources: this.buildSources(result),
        actions: [],
        trace_id: uuidv4()
      }
    } catch (error) {
      console.error('Error in execute:', error)
      return {
        content: 'I apologize, but I encountered an error processing your request.',
        type: 'chat',
        sources: [],
        actions: [],
        trace_id: uuidv4()
      }
    }
  }
}

// Add factory function to create executor instance
export function createChatGraphExecutor(): ChatGraphExecutor {
  return new ChatGraphExecutor()
} 