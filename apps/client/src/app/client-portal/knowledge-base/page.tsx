'use client'

import { useState, useEffect } from 'react'
import { createClient } from 'shared/src/lib/supabase'
import { KnowledgeBase } from 'shared/src/components/KnowledgeBase'
import { Database } from 'shared/src/types/database'
import { useRouter } from 'next/navigation'

type KBArticle = Database['public']['Tables']['knowledge_base_articles']['Row']

export default function KnowledgeBasePage() {
  const [articles, setArticles] = useState<KBArticle[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  
  const supabase = createClient()

  useEffect(() => {
    fetchArticles()
  }, [])

  async function fetchArticles() {
    try {
      const { data, error } = await supabase
        .from('knowledge_base_articles')
        .select<'*', KBArticle>('*')
        .eq('is_published', true) // Only show published articles to clients
        .order('created_at', { ascending: false })

      if (error) throw error
      setArticles(data || [])
    } catch (err) {
      console.error('Error fetching KB articles:', err)
      setError('Failed to load knowledge base articles')
    } finally {
      setLoading(false)
    }
  }

  const handleArticleClick = (article: KBArticle) => {
    router.push(`/client-portal/knowledge-base/${article.id}`)
  }

  return (
    <KnowledgeBase
      articles={articles}
      isLoading={loading}
      error={error}
      showNewButton={false} // Clients can't create articles
      onArticleClick={handleArticleClick}
    />
  )
} 