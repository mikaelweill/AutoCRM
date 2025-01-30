import { NextResponse } from 'next/server';
import { generateEmbedding, updateTicketEmbeddingWithComments } from '../lib/ai/embeddings';
import { createServerClient } from '../lib/supabase-server';

export async function handleEmbeddingsRoute(req: Request) {
  try {
    const { text, type, ticketId } = await req.json();
    
    if (!text) {
      return NextResponse.json(
        { error: 'Text is required' },
        { status: 400 }
      );
    }

    if (type === 'comment') {
      if (!ticketId) {
        return NextResponse.json(
          { error: 'Ticket ID is required for comments' },
          { status: 400 }
        );
      }
      await updateTicketEmbeddingWithComments(ticketId);
      return NextResponse.json({ success: true });
    }

    // Generate embedding
    const embedding = await generateEmbedding(text);

    // If ticketId is provided, store the embedding
    if (ticketId) {
      const supabase = createServerClient();
      const { error: storeError } = await supabase
        .from('ticket_embeddings')
        .upsert({
          id: ticketId,
          embedding: JSON.stringify(embedding),
          ticket_text: text
        });

      if (storeError) {
        console.error('Error storing embedding:', storeError);
        return NextResponse.json(
          { error: 'Failed to store embedding' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ embedding });
  } catch (error) {
    console.error('Error generating embedding:', error);
    return NextResponse.json(
      { error: 'Failed to generate embedding' },
      { status: 500 }
    );
  }
} 