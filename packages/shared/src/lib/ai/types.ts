// Core ticket type (using existing type from your system)
import { Ticket } from '../../types/tickets'

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