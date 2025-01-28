import { NextResponse } from 'next/server';
import { generateEmbedding, updateTicketEmbeddingWithComments } from '../lib/ai/embeddings';

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

    // Handle regular ticket embedding
    const embedding = await generateEmbedding(text);
    return NextResponse.json({ embedding });
  } catch (error) {
    console.error('Error generating embedding:', error);
    return NextResponse.json(
      { error: 'Failed to generate embedding' },
      { status: 500 }
    );
  }
} 