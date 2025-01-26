import { OpenAI } from 'openai';
import { createClient } from '../supabase';
import { Ticket } from '../../types/tickets';
import { TicketPriority } from '../../config/tickets';
import { Database } from '../database.types';

type TicketRow = Database['public']['Tables']['tickets']['Row'];
type TicketActivity = Database['public']['Tables']['ticket_activities']['Row'];

export async function generateEmbedding(text: string) {
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });
  
  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text,
  });
  
  return response.data[0].embedding;
}

export async function generateTicketEmbedding(ticket: Ticket) {
  // Combine relevant ticket text
  const ticketText = `
    Title: ${ticket.subject}
    Description: ${ticket.description}
    Priority: ${ticket.priority || ''}
  `.trim();

  return {
    embedding: await generateEmbedding(ticketText),
    ticketText
  };
}

interface TicketEmbeddingData {
  id: string;
  subject: string;
  description: string;
  priority: TicketPriority;
}

type CommentFields = Pick<TicketActivity, 'content' | 'created_at'>;

interface TicketWithComments extends Pick<TicketRow, 'id' | 'subject' | 'description' | 'priority'> {
  comments: CommentFields[];
}

export async function storeAndFindSimilarTickets(ticket: TicketEmbeddingData) {
  const supabase = createClient();
  
  try {
    // Generate embedding once
    const { embedding, ticketText } = await generateTicketEmbedding(ticket as Ticket);

    // Store embedding
    const { error: storeError } = await supabase
      .from('ticket_embeddings')
      .upsert({
        id: ticket.id,
        embedding,
        ticket_text: ticketText,
      });

    if (storeError) throw storeError;

    // Find similar tickets
    const { data: similarTickets, error: searchError } = await supabase
      .rpc('match_tickets', {
        query_embedding: embedding,
        match_threshold: 0.7,
        match_count: 5
      });

    if (searchError) throw searchError;

    return similarTickets;

  } catch (error) {
    console.error('Error in storeAndFindSimilarTickets:', error);
    throw error;
  }
}

export async function updateTicketEmbeddingWithComments(ticketId: string) {
  const supabase = createClient();
  
  try {
    // Get ticket and its public comments
    const { data, error: ticketError } = await supabase
      .from('tickets')
      .select(`
        id,
        subject,
        description,
        priority,
        comments:ticket_activities!inner(
          content,
          created_at
        )
      `)
      .eq('id', ticketId)
      .eq('ticket_activities.activity_type', 'comment')
      .eq('ticket_activities.is_internal', false)
      .single();

    if (ticketError) throw ticketError;
    if (!data) throw new Error('Ticket not found');

    // Type guard to verify the shape of our data
    const isTicketWithComments = (data: unknown): data is TicketWithComments => {
      const d = data as any;
      return (
        typeof d.id === 'string' &&
        typeof d.subject === 'string' &&
        typeof d.description === 'string' &&
        typeof d.priority === 'string' &&
        Array.isArray(d.comments) &&
        d.comments.every((c: any) => 
          typeof c.content === 'string' &&
          typeof c.created_at === 'string'
        )
      );
    };

    if (!isTicketWithComments(data)) {
      throw new Error('Invalid ticket data structure');
    }

    const ticket = data;

    // Format text with comments in chronological order
    const ticketText = `
      Title: ${ticket.subject}
      Description: ${ticket.description}
      Priority: ${ticket.priority || ''}
      Comments:
      ${ticket.comments
        .sort((a: CommentFields, b: CommentFields) => 
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
        .map((comment: CommentFields) => `- ${comment.content}`)
        .join('\n')}
    `.trim();

    // Generate new embedding
    const embedding = await generateEmbedding(ticketText);

    // Update embedding
    const { error: updateError } = await supabase
      .from('ticket_embeddings')
      .upsert({
        id: ticketId,
        embedding,
        ticket_text: ticketText,
      });

    if (updateError) throw updateError;

  } catch (error) {
    console.error('Error updating ticket embedding with comments:', error);
    throw error;
  }
} 