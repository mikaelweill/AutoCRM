'use client'

import { useEffect, useState } from 'react'
import { createClient } from 'shared/src/lib/supabase'
import { Database } from 'shared/src/types/database'
import { Card, CardContent, CardHeader, CardTitle } from 'shared/src/components/ui/card'
import { Skeleton } from 'shared/src/components/ui/skeleton'
import { ChevronLeft } from 'lucide-react'
import Link from 'next/link'
import { useParams } from 'next/navigation'

type KBArticle = Database['public']['Tables']['knowledge_base_articles']['Row']

export default function ArticleDetail() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [article, setArticle] = useState<KBArticle | null>(null)
  const supabase = createClient()
  const params = useParams()
  const id = params.id as string

  useEffect(() => {
    async function loadArticle() {
      try {
        const { data, error } = await supabase
          .from('knowledge_base_articles')
          .select<'*', KBArticle>('*')
          .eq('id', id)
          .eq('is_published', true)
          .single()

        if (error) throw error
        setArticle(data as KBArticle)
      } catch (err) {
        console.error('Error loading article:', err)
        setError('Failed to load article')
      } finally {
        setLoading(false)
      }
    }

    loadArticle()
  }, [id])

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  if (error || !article) {
    return (
      <div className="text-center py-8">
        <p className="text-red-500">{error || 'Article not found'}</p>
        <Link 
          href="/client-portal/knowledge-base"
          className="inline-flex items-center px-4 py-2 mt-4 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          Back to Knowledge Base
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Link 
          href="/client-portal/knowledge-base"
          className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back
        </Link>
        <div>
          <p className="text-sm text-muted-foreground">{article.category}</p>
          <h1 className="text-2xl font-bold">{article.title}</h1>
        </div>
      </div>

      <Card>
        <CardContent className="prose prose-sm max-w-none py-6">
          {article.content}
        </CardContent>
      </Card>

      <div className="text-sm text-muted-foreground">
        Last updated: {new Date(article.updated_at).toLocaleDateString()}
      </div>
    </div>
  )
} 