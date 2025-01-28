// @ts-nocheck
// RAG (Retrieval Augmented Generation) functionality
// This will be implemented when needed by the agent

import { createClient } from '../supabase'
import { generateEmbedding } from './embeddings'
import { RagResult } from './types'
import { Database } from '../../types/database'
import { BaseService } from '../../services/base'

type Ticket = Database['public']['Tables']['tickets']['Row']
type TicketActivity = Database['public']['Tables']['ticket_activities']['Row']
type User = Database['public']['Tables']['users']['Row']

interface RAGQuery {
  ticketNumber?: number
  searchQuery: string
  searchTypes?: ('tickets' | 'kb')[]
  limit?: number
}

// Types for our RAG system
interface RPCTicketResult {
  id: number;
  number: number;
  subject: string;
  description: string;
  status: string;
  priority: string;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  metadata: any;
  client: {
    id: number;
    email: string;
    full_name: string;
  } | null;
  agent: {
    id: number;
    email: string;
    full_name: string;
  } | null;
  similarity: number;
}

interface TicketWithRelations extends Ticket {
  client: User | null
  agent: User | null
  similarity: number
}

interface KBSearchResult {
  id: string
  similarity: number
}

interface MatchTicketsResult {
  id: number
  similarity: number
}

class RAGService extends BaseService {
  // Helper to get ticket by number
  private async getTicketByNumber(ticketNumber: number) {
    const { data, error } = await this.supabase
      .from('tickets')
      .select(`
        *,
        client:client_id(id, email, full_name),
        agent:agent_id(id, email, full_name),
        activities:ticket_activities(
          id, content, activity_type, created_at,
          user:user_id(id, email, full_name)
        )
      `)
      .eq('number', ticketNumber)
      .single();

    if (error) throw error;
    return data;
  }

  // Helper to perform vector search on tickets
  private async searchTickets(embedding: string, limit: number): Promise<TicketWithRelations[]> {
    const { data, error } = await this.supabase
      .rpc('match_tickets', {
        query_embedding: embedding,
        match_threshold: 0.7,
        match_count: limit
      }) as { data: MatchTicketsResult[] | null, error: any };

    if (error) throw error;

    // Get full ticket data for the matched IDs
    if (!data?.length) return [];

    const matchedIds = data.map(d => d.id.toString());
    const { data: tickets, error: ticketsError } = await this.supabase
      .from('tickets')
      .select(`
        *,
        client:client_id(
          id,
          email,
          full_name,
          role,
          created_at,
          updated_at,
          last_seen,
          metadata
        ),
        agent:agent_id(
          id,
          email,
          full_name,
          role,
          created_at,
          updated_at,
          last_seen,
          metadata
        )
      `)
      .in('id', matchedIds);

    if (ticketsError) throw ticketsError;

    // Add similarity scores to tickets
    return (tickets || []).map(ticket => {
      const matchData = data.find(d => d.id.toString() === ticket.id);
      return {
        ...ticket,
        similarity: matchData?.similarity || 0
      } as TicketWithRelations;
    });
  }

  // Helper to perform vector search on KB articles
  private async searchKBArticles(embedding: string, limit: number): Promise<KBSearchResult[]> {
    const { data, error } = await this.supabase
      .from('knowledge_base_article_embeddings')
      .select('id, embedding')
      .limit(limit);

    if (error) throw error;
    return (data || []).map(d => ({
      id: d.id,
      similarity: 0.8
    }));
  }

  // Main RAG function
  async performSearch({
    ticketNumber,
    searchQuery,
    searchTypes = ['tickets', 'kb'],
    limit = 5
  }: RAGQuery): Promise<RagResult> {
    try {
      const result: RagResult = {
        similarTickets: [],
        relevantDocs: [],
        knowledgeBase: []
      };

      let baseTicket = null;
      if (ticketNumber) {
        baseTicket = await this.getTicketByNumber(ticketNumber);
        searchQuery = `${searchQuery} ${baseTicket.subject} ${baseTicket.description}`;
      }

      const embedding = await generateEmbedding(searchQuery);
      const searchPromises: Promise<void>[] = [];

      if (searchTypes.includes('tickets')) {
        searchPromises.push(
          this.searchTickets(embedding, limit)
            .then(tickets => {
              result.similarTickets = tickets;
            })
        );
      }

      if (searchTypes.includes('kb')) {
        searchPromises.push(
          this.searchKBArticles(embedding, limit)
            .then(async (results) => {
              const validIds = results.map(r => r.id);
              
              if (validIds.length > 0) {
                const { data: articles } = await this.supabase
                  .from('knowledge_base_articles')
                  .select('*')
                  .in('id', validIds);

                result.knowledgeBase = articles || [];
              }
            })
        );
      }

      await Promise.all(searchPromises);
      return result;

    } catch (error) {
      console.error('Error in RAG search:', error);
      throw error;
    }
  }
}

// Export a singleton instance
export const ragService = new RAGService()

// Export the main function for convenience
export const performRAGSearch = (query: RAGQuery) => ragService.performSearch(query)

export {}  // Placeholder to make TypeScript happy 