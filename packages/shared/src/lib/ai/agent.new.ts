// @ts-nocheck

import { Tool } from '@langchain/core/tools'
import { MessageType, MessageClassification, AgentResponse } from './types'
import { LangChainTracer } from 'langchain/callbacks'
import { BaseCallbackHandler } from '@langchain/core/callbacks/base'
import { v4 as uuidv4 } from 'uuid'
import { performRAGSearch } from './rag'

// Simple tracer for graph execution
class GraphTracer {
  constructor(
    private runId: string,
    private projectName: string = process.env.LANGCHAIN_PROJECT || "autocrm"
  ) {}

  async logEvent(type: string, data: any) {
    console.log({
      type,
      data,
      runId: this.runId,
      projectName: this.projectName,
      timestamp: new Date().toISOString(),
      tags: ["autocrm", this.runId]
    })
  }
}

// Keep our existing tools
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

// Update the NodeResult interface to be generic
interface NodeResult<T> {
  output: T
  metadata: {
    requiresAction?: boolean
    requiresSearch?: boolean
    confidence: number
    nextNode?: string
    trace_id?: string
  }
}

interface ProcessContext {
  agent_id: string
  trace_id?: string
  tools: {
    rag: RAGTool
    ticket: TicketTool
  }
}

// Define all possible node outputs
interface NodeOutputs {
  input: InputNodeOutput
  decision: DecisionNodeOutput
  rag: RAGNodeOutput
  ticket: TicketActionOutput
  response: ResponseNodeOutput
}

// Update BaseNode to be generic
abstract class BaseNode<InputType = any, OutputType = any> {
  abstract process(input: InputType, context: ProcessContext): Promise<NodeResult<OutputType>>
  abstract getNextNode(result: NodeResult<OutputType>): BaseNode<any, any> | null
}

// Define structured output types for each node
interface InputNodeOutput {
  message: string
  intent?: 'question' | 'ticket_action' | 'conversation'
  extracted_ticket_number?: number
}

interface DecisionNodeOutput {
  type: 'direct' | 'rag' | 'ticket'
  reasoning: string
  confidence: number
  action_details?: {
    ticket_number?: number
    action_type?: string
    parameters?: Record<string, any>
  }
  search_query?: string
}

interface RAGNodeOutput {
  search_function: 'search_by_query' | 'search_with_ticket'
  search_parameters: {
    query: string
    ticket_number?: number
  }
  analysis: {
    requires_action: boolean
    requires_more_context: boolean
    confidence: number
    suggested_action?: {
      type: string
      ticket_id?: number
      reason: string
    }
  }
}

interface TicketActionOutput {
  action_type: 'update' | 'assign' | 'comment' | 'close' | 'review'
  ticket_id: number
  parameters: Record<string, any>
  verification: {
    permission_checked: boolean
    permission_granted: boolean
    error_message?: string
  }
}

interface ResponseNodeOutput {
  message_type: MessageType
  content: string
  sources?: Array<{
    type: 'ticket' | 'kb'
    id: string | number
    title: string
    excerpt: string
    relevance: number
  }>
  actions?: Array<{
    type: string
    status: 'success' | 'failed' | 'pending'
    details: string
  }>
  next_steps?: Array<string>
}

// Update node implementations with proper types
class InputNode extends BaseNode<string, InputNodeOutput> {
  async process(input: string, context: ProcessContext): Promise<NodeResult<InputNodeOutput>> {
    const hasTicket = input.match(/#(\d+)/)
    const isQuestion = input.includes('?') || 
                      input.toLowerCase().startsWith('what') ||
                      input.toLowerCase().startsWith('how') ||
                      input.toLowerCase().startsWith('when')

    return {
      output: {
        message: input.trim(),
        intent: hasTicket ? 'ticket_action' : (isQuestion ? 'question' : 'conversation'),
        extracted_ticket_number: hasTicket ? parseInt(hasTicket[1]) : undefined
      },
      metadata: {
        confidence: 1.0,
        nextNode: 'decision',
        trace_id: context.trace_id
      }
    }
  }

  getNextNode(result: NodeResult<InputNodeOutput>): BaseNode<any, any> {
    return new DecisionNode()
  }
}

class DecisionNode extends BaseNode<InputNodeOutput, DecisionNodeOutput> {
  async process(input: InputNodeOutput, context: ProcessContext): Promise<NodeResult<DecisionNodeOutput>> {
    return {
      output: {
        type: input.intent === 'ticket_action' ? 'ticket' : 
              input.intent === 'question' ? 'rag' : 'direct',
        reasoning: `Determined type based on intent: ${input.intent}`,
        confidence: 0.8,
        action_details: input.extracted_ticket_number ? {
          ticket_number: input.extracted_ticket_number,
          action_type: 'review'
        } : undefined,
        search_query: input.intent === 'question' ? input.message : undefined
      },
      metadata: {
        requiresAction: input.intent === 'ticket_action',
        requiresSearch: input.intent === 'question',
        confidence: 0.8,
        nextNode: input.intent === 'ticket_action' ? 'ticket' : 
                 input.intent === 'question' ? 'rag' : 'response',
        trace_id: context.trace_id
      }
    }
  }

  getNextNode(result: NodeResult<DecisionNodeOutput>): BaseNode<any, any> {
    switch(result.metadata.nextNode) {
      case 'ticket':
        return new TicketActionNode()
      case 'rag':
        return new RAGNode()
      default:
        return new ResponseNode()
    }
  }
}

class RAGNode extends BaseNode<DecisionNodeOutput, RAGNodeOutput> {
  async process(input: DecisionNodeOutput, context: ProcessContext): Promise<NodeResult<RAGNodeOutput>> {
    // Format the search query according to tool requirements
    const searchQuery = input.action_details?.ticket_number 
      ? `search_with_ticket(${input.action_details.ticket_number}, "${input.search_query}")` 
      : `search_by_query("${input.search_query}")`;

    const results = JSON.parse(await context.tools.rag._call(searchQuery))
    const analysis = this.analyzeResults(results)

    return {
      output: {
        search_function: input.action_details?.ticket_number ? 'search_with_ticket' : 'search_by_query',
        search_parameters: {
          query: input.search_query || '',
          ticket_number: input.action_details?.ticket_number
        },
        analysis: {
          requires_action: analysis.requiresAction,
          requires_more_context: analysis.requiresMoreContext,
          confidence: analysis.confidence,
          suggested_action: analysis.suggestedAction ? {
            type: analysis.suggestedAction.type,
            ticket_id: analysis.suggestedAction.ticketId,
            reason: 'High priority similar ticket found'
          } : undefined
        }
      },
      metadata: {
        requiresAction: analysis.requiresAction,
        requiresSearch: analysis.requiresMoreContext,
        confidence: analysis.confidence,
        nextNode: this.determineNextNode(analysis),
        trace_id: context.trace_id
      }
    }
  }

  private analyzeResults(results: any): {
    requiresAction: boolean
    requiresMoreContext: boolean
    confidence: number
    suggestedAction?: {
      type: string
      ticketId?: number
    }
  } {
    if (results.status === 'error') {
      return {
        requiresAction: false,
        requiresMoreContext: true,
        confidence: 0.5
      }
    }

    // Check if results suggest a ticket action is needed
    const similarTickets = results.similarTickets || []
    const hasHighPriorityTickets = similarTickets.some(
      (t: any) => t.priority === 'high' && t.similarity > 0.8
    )
    
    // Check if we need more context
    const lowConfidenceResults = 
      (similarTickets.length === 0 && (!results.knowledgeBase || results.knowledgeBase.length === 0)) ||
      (similarTickets.length > 0 && similarTickets[0].similarity < 0.6)

    // If we found a very similar high priority ticket, suggest taking action
    if (hasHighPriorityTickets) {
      const ticket = similarTickets.find(
        (t: any) => t.priority === 'high' && t.similarity > 0.8
      )
      return {
        requiresAction: true,
        requiresMoreContext: false,
        confidence: 0.9,
        suggestedAction: {
          type: 'review_similar_ticket',
          ticketId: ticket.number
        }
      }
    }

    // If results are low confidence, we need more context
    if (lowConfidenceResults) {
      return {
        requiresAction: false,
        requiresMoreContext: true,
        confidence: 0.5
      }
    }

    // Otherwise, we can proceed with the search results
    return {
      requiresAction: false,
      requiresMoreContext: false,
      confidence: 0.8
    }
  }

  private determineNextNode(analysis: {
    requiresAction: boolean
    requiresMoreContext: boolean
    confidence: number
  }): string {
    if (analysis.requiresMoreContext) return 'decision'
    if (analysis.requiresAction) return 'ticket'
    return 'response'
  }

  getNextNode(result: NodeResult<RAGNodeOutput>): BaseNode<any, any> {
    switch(result.metadata.nextNode) {
      case 'decision':
        return new DecisionNode()
      case 'ticket':
        return new TicketActionNode()
      default:
        return new ResponseNode()
    }
  }
}

class TicketActionNode extends BaseNode<DecisionNodeOutput | RAGNodeOutput, TicketActionOutput> {
  async process(input: DecisionNodeOutput | RAGNodeOutput, context: ProcessContext): Promise<NodeResult<TicketActionOutput>> {
    const ticketId = 'action_details' in input ? 
      input.action_details?.ticket_number : 
      input.analysis?.suggested_action?.ticket_id;

    const actionType = 'action_details' in input ?
      input.action_details?.action_type :
      input.analysis?.suggested_action?.type;

    // Check permissions first
    const hasPermission = await this.verifyPermissions(context.agent_id, {
      ticketId,
      actionType
    })

    return {
      output: {
        action_type: (actionType as 'update' | 'assign' | 'comment' | 'close' | 'review') || 'review',
        ticket_id: ticketId || 0,
        parameters: {},
        verification: {
          permission_checked: true,
          permission_granted: hasPermission.granted,
          error_message: hasPermission.error
        }
      },
      metadata: {
        requiresAction: false,
        requiresSearch: false,
        confidence: 1.0,
        nextNode: 'response',
        trace_id: context.trace_id
      }
    }
  }

  private async verifyPermissions(agentId: string, action: any): Promise<{
    granted: boolean
    error?: string
  }> {
    // TODO: Implement actual permission checking
    return { granted: true }
  }

  getNextNode(result: NodeResult<TicketActionOutput>): BaseNode<any, any> {
    return new ResponseNode()
  }
}

// Update type guard to be more specific
function isRAGNodeOutput(input: RAGNodeOutput | TicketActionOutput | DecisionNodeOutput): input is RAGNodeOutput {
  return 'search_parameters' in input && 
         'analysis' in input && 
         'requires_action' in (input as any).analysis;
}

function isTicketActionOutput(input: RAGNodeOutput | TicketActionOutput | DecisionNodeOutput): input is TicketActionOutput {
  return 'action_type' in input && 'verification' in input;
}

// Update ResponseNode to use proper types
class ResponseNode extends BaseNode<RAGNodeOutput | TicketActionOutput | DecisionNodeOutput, ResponseNodeOutput> {
  async process(
    input: RAGNodeOutput | TicketActionOutput | DecisionNodeOutput,
    context: ProcessContext
  ): Promise<NodeResult<ResponseNodeOutput>> {
    let response: ResponseNodeOutput = {
      message_type: 'chat',
      content: '',
      next_steps: []
    }

    if (isRAGNodeOutput(input)) {
      // TypeScript now knows this is RAGNodeOutput with the correct shape
      response = {
        message_type: 'information',
        content: `Based on search for "${input.search_parameters.query}"`,
        sources: [], // We'll add sources when we get the actual search results
        next_steps: input.analysis.requires_action ? 
          ['Review suggested ticket action'] : 
          ['Ask follow-up question', 'Request more details']
      }
    } else if (isTicketActionOutput(input)) {
      response = {
        message_type: 'action',
        content: `Action ${input.action_type} on ticket #${input.ticket_id}`,
        actions: [{
          type: input.action_type,
          status: input.verification.permission_granted ? 'success' : 'failed',
          details: input.verification.error_message || `Ticket #${input.ticket_id}`
        }],
        next_steps: ['View ticket details', 'Perform another action']
      }
    } else {
      // Must be DecisionNodeOutput
      response = {
        message_type: 'chat',
        content: this.getDirectResponse(input),
        next_steps: ['Ask a question', 'View tickets']
      }
    }

    return {
      output: response,
      metadata: {
        confidence: 1.0,
        nextNode: 'end',
        trace_id: context.trace_id
      }
    }
  }

  private getDirectResponse(input: DecisionNodeOutput): string {
    if (input.type === 'direct') {
      return 'I understand your message. How can I help you further?'
    }
    return `I'll help you with your ${input.type} request. What would you like to know?`
  }

  getNextNode(result: NodeResult<ResponseNodeOutput>): BaseNode | null {
    return null // End of flow
  }
}

// Update the main agent class to use proper types
export class AssistantAgent {
  private trace_id: string
  private tools: {
    rag: RAGTool
    ticket: TicketTool
  }
  private tracer: GraphTracer
  private currentNode: BaseNode<any, any>

  constructor(private agent_id: string) {
    this.trace_id = agent_id
    this.tracer = new GraphTracer(agent_id)
    this.tools = {
      rag: new RAGTool(),
      ticket: new TicketTool()
    }
    this.currentNode = new InputNode()
  }

  async processMessage(input: string): Promise<AgentResponse> {
    try {
      await this.tracer.logEvent('chain_start', {
        name: "Agent Interaction",
        input
      })

      let result = await this.currentNode.process(input, {
        agent_id: this.agent_id,
        trace_id: this.trace_id,
        tools: this.tools
      })
      
      while (this.currentNode) {
        const nextNode = this.currentNode.getNextNode(result)
        if (!nextNode) break
        
        await this.tracer.logEvent('node_transition', {
          from: this.currentNode.constructor.name,
          to: nextNode.constructor.name,
          metadata: result.metadata
        })
        
        this.currentNode = nextNode
        result = await this.currentNode.process(result.output, {
          agent_id: this.agent_id,
          trace_id: this.trace_id,
          tools: this.tools
        })
      }

      await this.tracer.logEvent('chain_end', {
        output: result.output
      })

      return result.output as AgentResponse
    } catch (error) {
      console.error('Error in graph execution:', error)
      
      await this.tracer.logEvent('chain_error', {
        error: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack
        } : error
      })

      return {
        content: 'I apologize, but I encountered an error processing your request.',
        type: 'chat',
        sources: [],
        actions: [],
        trace_id: this.trace_id
      }
    }
  }
}

// Export factory function
export async function createAssistantAgent(tracer: LangChainTracer, runId?: string) {
  const agent_id = runId || uuidv4()
  console.log('Creating assistant agent with ID:', agent_id)
  return new AssistantAgent(agent_id)
} 