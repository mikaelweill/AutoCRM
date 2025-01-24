'use client'

import { useState, useEffect } from 'react'
import { createClient } from 'shared/src/lib/supabase'
import { KBArticleViewer } from 'shared/src/components/KBArticleViewer'
import { Database } from 'shared/src/types/database'
import { useRouter } from 'next/navigation'

type KBArticle = Database['public']['Tables']['knowledge_base_articles']['Row']

export default function ArticlePage({ params }: { params: { id: string } }) {
  const [article, setArticle] = useState<KBArticle | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function fetchArticle() {
      try {
        const { data, error } = await supabase
          .from('knowledge_base_articles')
          .select<'*', KBArticle>('*')
          .eq('id', params.id)
          .eq('is_published', true)
          .single()

        if (error) throw error
        if (!data) {
          setError('Article not found')
          return
        }

        setArticle(data)
      } catch (err) {
        console.error('Error fetching article:', err)
        setError('Failed to load article')
      } finally {
        setLoading(false)
      }
    }

    fetchArticle()
  }, [params.id])

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  if (error || !article) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error || 'Article not found'}
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <button
        onClick={() => router.back()}
        className="mb-6 text-sm text-gray-500 hover:text-gray-700"
      >
        ← Back to Knowledge Base
      </button>
      <KBArticleViewer article={article} />
    </div>
  )
} 