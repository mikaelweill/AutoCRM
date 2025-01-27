import { NextResponse } from 'next/server';
import { storeKBArticleEmbedding, generateAndStoreSummaryEmbedding } from 'shared/src/lib/ai/embeddings';
import { Database } from 'shared/src/types/database';

type KBArticle = Database['public']['Tables']['knowledge_base_articles']['Row'];

export async function POST(request: Request) {
  try {
    const article = await request.json() as KBArticle;

    // Validate required fields
    if (!article.id || !article.title || !article.content || !article.category) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Process article embedding
    await storeKBArticleEmbedding({
      id: article.id,
      title: article.title,
      content: article.content,
      category: article.category
    });

    // Process summary embedding
    await generateAndStoreSummaryEmbedding(article);

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error processing KB embeddings:', error);
    return NextResponse.json(
      { error: 'Failed to process embeddings' },
      { status: 500 }
    );
  }
} 