// RAG (Retrieval Augmented Generation) functionality
// This will be implemented when needed by the agent

import { createServerClient } from '../supabase-server'
import { generateEmbedding } from './embeddings'
import { RagResult } from './types'
import { Database } from '../../types/database'
import { BaseService } from '../../services/base'

type Tables = Database['public']['Tables']
type TicketRow = Tables['tickets']['Row']
type TicketActivityRow = Tables['ticket_activities']['Row']
type UserRow = Tables['users']['Row']

type JsonValue = string | number | boolean | null | { [key: string]: JsonValue } | JsonValue[]

interface RAGQuery {
  ticketNumber?: number
  searchQuery: string
  searchTypes?: ('tickets' | 'kb')[]
  limit?: number
}

// Types for our RAG system
interface DevectorizedTicketResult {
  id: string;
  number: number;
  subject: string;
  description: string;
  status: string;
  priority: string;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  metadata: JsonValue;
  client: {
    id: string;
    email: string;
    full_name: string;
  } | null;
  agent: {
    id: string;
    email: string;
    full_name: string;
  } | null;
  activities: Array<{
    id: string;
    content: string;
    activity_type: string;
    created_at: string;
    is_internal: boolean;
    user: {
      id: string;
      email: string;
      full_name: string;
    };
  }>;
  similarity: number;
}

interface KBSearchResult {
  id: string;
  title: string;
  content: string;
  category: string;
  subcategory?: string | null;
  created_at: string;
  updated_at: string;
  is_published: boolean;
  metadata: JsonValue;
  similarity: number;
}

class RAGService extends BaseService {
  protected supabase = createServerClient()  // Use server client with service role

  // Helper to get ticket by number
  private async getTicketByNumber(ticketNumber: number) {
    console.log(`[RAG] Fetching ticket #${ticketNumber}`);
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

    if (error) {
      console.error(`[RAG] Error fetching ticket #${ticketNumber}:`, error);
      throw error;
    }
    console.log(`[RAG] Found ticket:`, data);
    return data;
  }

  // Helper to perform vector search on tickets using devectorized function
  private async searchTickets(embedding: number[], limit: number): Promise<DevectorizedTicketResult[]> {
    console.log(`[RAG] Searching tickets with embedding of length ${embedding.length}, limit ${limit}`);
    
    // First check if we have any embeddings at all
    const { count, error: countError } = await this.supabase
      .from('ticket_embeddings')
      .select('id', { count: 'exact' })
    
    console.log(`[RAG] Found ${count || 0} total ticket embeddings in database`);
    
    if (countError) {
      console.error('[RAG] Error checking ticket embeddings:', countError);
      throw countError;
    }

    // Get matches from match_tickets function
    const { data: matches, error } = await this.supabase
      .rpc('match_tickets', {
        query_embedding: embedding as unknown as any,
        match_threshold: 0,
        match_count: limit
      }) as { data: DevectorizedTicketResult[] | null, error: any };

    if (error) {
      console.error('[RAG] Error searching tickets:', error);
      throw error;
    }

    if (!matches?.length) {
      console.log('[RAG] No matches found');
      return [];
    }

    // Fetch activities for the matched tickets
    const { data: ticketsWithActivities, error: activitiesError } = await this.supabase
      .from('tickets')
      .select(`
        id,
        activities:ticket_activities(
          id,
          content,
          activity_type,
          created_at,
          is_internal,
          user:users(id, email, full_name)
        )
      `)
      .in('id', matches.map(m => m.id));

    if (activitiesError) {
      console.error('[RAG] Error fetching activities:', activitiesError);
      throw activitiesError;
    }

    // Merge activities with the matched tickets
    const results = matches.map(ticket => {
      const ticketActivities = ticketsWithActivities?.find(t => t.id === ticket.id)?.activities || [];
      return {
        ...ticket,
        activities: ticketActivities.map(activity => ({
          id: activity.id,
          content: activity.content || '',
          activity_type: activity.activity_type,
          created_at: activity.created_at,
          is_internal: activity.is_internal || false,
          user: {
            id: activity.user.id,
            email: activity.user.email,
            full_name: activity.user.full_name
          }
        }))
      } as DevectorizedTicketResult;
    });

    console.log(`[RAG] Found ${results.length} matching tickets with similarity >= 0`);
    if (results.length) {
      console.log('[RAG] Top ticket matches:', results.map(t => ({
        number: t.number,
        subject: t.subject,
        similarity: t.similarity,
        id: t.id,
        activities_count: t.activities?.length || 0
      })));
    }

    return results;
  }

  // Helper to perform vector search on KB articles
  private async searchKBArticles(embedding: number[], limit: number): Promise<KBSearchResult[]> {
    console.log(`[RAG] Searching KB articles with embedding of length ${embedding.length}, limit ${limit}`);
    // TODO: Implement devectorized KB article search similar to tickets
    const { data, error } = await this.supabase
      .from('knowledge_base_article_embeddings')
      .select(`        id,
        article:id(
          id,
          title,
          content,
          category,
          subcategory,
          created_at,
          updated_at,
          is_published,
          metadata
        )
      `)
      .limit(limit);

    if (error) {
      console.error('[RAG] Error searching KB articles:', error);
      throw error;
    }
    console.log(`[RAG] Found ${data?.length || 0} KB articles`);
    if (data?.length) {
      console.log('[RAG] KB article matches:', data.map(d => ({
        title: d.article.title,
        category: d.article.category
      })));
    }
    return (data || []).map(d => ({
      ...d.article,
      similarity: 0.8 // TODO: Implement proper similarity calculation
    })) as KBSearchResult[];
  }

  // Main RAG function
  async performSearch({
    ticketNumber,
    searchQuery,
    searchTypes = ['tickets', 'kb'],
    limit = 5
  }: RAGQuery): Promise<RagResult> {
    console.log('[RAG] Starting search with params:', {
      ticketNumber,
      searchQuery,
      searchTypes,
      limit
    });

    try {
      const result: RagResult = {
        similarTickets: [],
        relevantDocs: [],
        knowledgeBase: []
      };

      let baseTicket = null;
      if (ticketNumber) {
        console.log(`[RAG] Including context from ticket #${ticketNumber}`);
        baseTicket = await this.getTicketByNumber(ticketNumber);
        searchQuery = `${searchQuery} ${baseTicket.subject} ${baseTicket.description}`;
        console.log('[RAG] Enhanced search query:', searchQuery);
      }

      console.log('[RAG] Generating embedding for query...');
      const embedding = await generateEmbedding(searchQuery);
      console.log(`[RAG] Generated embedding of length ${embedding.length}`);

      const searchPromises: Promise<void>[] = [];

      if (searchTypes.includes('tickets')) {
        console.log('[RAG] Adding ticket search to queue');
        searchPromises.push(
          this.searchTickets(embedding, limit)
            .then(tickets => {
              result.similarTickets = tickets;
              console.log(`[RAG] Completed ticket search, found ${tickets.length} matches`);
            })
        );
      }

      if (searchTypes.includes('kb')) {
        console.log('[RAG] Adding KB article search to queue');
        searchPromises.push(
          this.searchKBArticles(embedding, limit)
            .then(articles => {
              result.knowledgeBase = articles;
              console.log(`[RAG] Completed KB search, found ${articles.length} matches`);
            })
        );
      }

      await Promise.all(searchPromises);
      console.log('[RAG] Search completed. Final results:', {
        similarTicketsCount: result.similarTickets.length,
        knowledgeBaseCount: result.knowledgeBase.length
      });
      return result;

    } catch (error) {
      console.error('[RAG] Error in RAG search:', error);
      throw error;
    }
  }
}

// Export a singleton instance
export const ragService = new RAGService()

// Export the main function for convenience
export const performRAGSearch = (query: RAGQuery) => ragService.performSearch(query)

export type { DevectorizedTicketResult, KBSearchResult }  // Export types for use in other files 
