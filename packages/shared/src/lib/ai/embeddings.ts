import { OpenAI } from 'openai';
import { createServerClient } from '../supabase-server';
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

type CommentFields = Pick<TicketActivity, 
  'content' | 
  'created_at' | 
  'activity_type' | 
  'is_internal'
>;

interface TicketWithActivities extends Pick<TicketRow, 'id' | 'subject' | 'description' | 'priority'> {
  activities: CommentFields[];
}

export async function storeAndFindSimilarTickets(ticket: TicketEmbeddingData) {
  const supabase = createServerClient();
  
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
  const supabase = createServerClient();
  
  try {
    console.log('Starting embedding update for ticket:', ticketId);

    console.log(ticketId)
    // Get ticket and its public comments
    const { data, error: ticketError } = await supabase
      .from('tickets')
      .select(`
        id,
        subject,
        description,
        priority,
        activities:ticket_activities(
          id,
          content,
          created_at,
          activity_type,
          is_internal,
          user:users(id, email, full_name)
        )
      `)
      .eq('id', ticketId)
      .single()

    console.log('Query result:', { data, error: ticketError });

    if (ticketError) {
      console.log('Error fetching ticket:', ticketError);
      throw ticketError;
    }
    if (!data) {
      console.log('No ticket found with ID:', ticketId);
      throw new Error('Ticket not found');
    }

    // Type guard to verify the shape of our data
    const isTicketWithComments = (data: unknown): data is TicketWithActivities => {
      const d = data as any;
      return (
        typeof d.id === 'string' &&
        typeof d.subject === 'string' &&
        typeof d.description === 'string' &&
        typeof d.priority === 'string' &&
        Array.isArray(d.activities) &&
        d.activities.every((c: any) => 
          typeof c.content === 'string' &&
          typeof c.created_at === 'string' &&
          typeof c.activity_type === 'string' &&
          typeof c.is_internal === 'boolean'
        )
      );
    };

    if (!isTicketWithComments(data)) {
      throw new Error('Invalid ticket data structure');
    }

    const ticket = data;

    console.log('Filtering comments...');
    const filteredComments = ticket.activities.filter(c => 
      c.activity_type === 'comment' && 
      !c.is_internal
    );
    console.log('Filtered comments count:', filteredComments.length);

    console.log('Generating text...');
    const ticketText = `
      Title: ${ticket.subject}
      Description: ${ticket.description}
      Priority: ${ticket.priority || ''}
      Comments:
      ${filteredComments
        .sort((a: CommentFields, b: CommentFields) => 
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
        .map((comment: CommentFields) => `- ${comment.content}`)
        .join('\n')}
    `.trim();

    console.log('Generating embedding...');
    const embedding = await generateEmbedding(ticketText);
    console.log('Embedding generated');

    console.log('Upserting embedding...');
    const { error: updateError } = await supabase
      .from('ticket_embeddings')
      .upsert({
        id: ticketId,
        embedding,
        ticket_text: ticketText,
      });

    if (updateError) {
      console.log('Upsert error:', updateError);
      throw updateError;
    }

    console.log('Embedding update complete!');
    return true;

  } catch (error) {
    console.error('Error updating ticket embedding with comments:', error);
    throw error;
  }
}

interface KBArticleEmbeddingData {
  id: string;
  title: string;
  content: string;
  category: string;
  subcategory?: string;
}

export async function generateKBArticleEmbedding(article: KBArticleEmbeddingData) {
  // Combine relevant article text
  const articleText = `
    Title: ${article.title}
    Category: ${article.category}
    ${article.subcategory ? `Subcategory: ${article.subcategory}` : ''}
    Content: ${article.content}
  `.trim();

  return {
    embedding: await generateEmbedding(articleText),
    articleText
  };
}

export async function storeKBArticleEmbedding(article: KBArticleEmbeddingData) {
  const supabase = createServerClient();
  
  try {
    console.log('Generating embedding for KB article:', article.id);
    
    // Generate embedding
    const { embedding, articleText } = await generateKBArticleEmbedding(article);

    console.log('Storing KB article embedding...');
    // Store embedding
    const { error: storeError } = await supabase
      .from('knowledge_base_article_embeddings')
      .upsert({
        id: article.id,
        embedding,
        article_text: articleText,
      });

    if (storeError) {
      console.error('Error storing KB article embedding:', storeError);
      throw storeError;
    }

    console.log('KB article embedding stored successfully');
    return true;

  } catch (error) {
    console.error('Error in storeKBArticleEmbedding:', error);
    throw error;
  }
} 