import { storeKBArticleEmbedding } from 'shared/src/lib/ai/embeddings';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const article = await req.json();
    
    if (!article.id || !article.title || !article.content) {
      return NextResponse.json(
        { error: 'Article ID, title, and content are required' },
        { status: 400 }
      );
    }

    await storeKBArticleEmbedding(article);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error generating KB article embedding:', error);
    return NextResponse.json(
      { error: 'Failed to generate KB article embedding' },
      { status: 500 }
    );
  }
} 