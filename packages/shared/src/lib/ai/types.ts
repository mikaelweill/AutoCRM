// Core ticket type (using existing type from your system)
import { Ticket } from '../../types/tickets'

// Message classification types
export type MessageType = 'chat' | 'information' | 'action' | 'complex'

export interface MessageClassification {
  type: MessageType
  confidence: number
  reasoning: string
  requiredTools?: string[]
}

// Agent response types
export interface AgentResponse {
  content: string
  type: MessageType
  sources?: {
    type: 'kb' | 'ticket' | 'doc'
    id: string
    title: string
    excerpt: string
  }[]
  actions?: {
    type: string
    status: 'success' | 'failed'
    details: string
  }[]
  trace_id?: string
}

// Minimal types needed for now
export interface RagResult {
  similarTickets: any[];
  relevantDocs: any[];
  knowledgeBase: any[];
}

export interface EvaluatorOutput {
  ticketType: string;
  complexity: 'simple' | 'medium' | 'complex';
  relevantContext: string[];
  reasoning: string;
  confidence: number;
}

// Only embedding types for now
export interface EmbeddingResult {
  id: string;
  similarity: number;
} 