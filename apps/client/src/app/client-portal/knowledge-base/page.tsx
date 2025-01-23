'use client'

import { useEffect, useState } from 'react'
import { createClient } from 'shared/src/lib/supabase'
import { Database } from 'shared/src/types/database'
import { Card, CardContent, CardHeader, CardTitle } from 'shared/src/components/ui/card'
import { Skeleton } from 'shared/src/components/ui/skeleton'
import { Button } from 'shared/src/components/ui/Button'
import { ChevronRight } from 'lucide-react'
import Link from 'next/link'

type KBArticle = Database['public']['Tables']['knowledge_base_articles']['Row']

interface CategoryGroup {
  category: string
  articles: KBArticle[]
}

export default function KnowledgeBase() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [categories, setCategories] = useState<CategoryGroup[]>([])
  const supabase = createClient()

  useEffect(() => {
    async function loadArticles() {
      try {
        const { data: articles, error } = await supabase
          .from('knowledge_base_articles')
          .select<'*', KBArticle>('*')
          .eq('is_published', true)
          .order('category')
          .order('title')

        if (error) throw error

        // Group articles by category
        const grouped = (articles as KBArticle[]).reduce((acc: CategoryGroup[], article) => {
          const existing = acc.find(g => g.category === article.category)
          if (existing) {
            existing.articles.push(article)
          } else {
            acc.push({ category: article.category, articles: [article] })
          }
          return acc
        }, [])

        setCategories(grouped)
      } catch (err) {
        console.error('Error loading KB articles:', err)
        setError('Failed to load knowledge base articles')
      } finally {
        setLoading(false)
      }
    }

    loadArticles()
  }, [])

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-500">{error}</p>
        <Button onClick={() => window.location.reload()} className="mt-4">
          Try Again
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Knowledge Base</h1>
      </div>

      {categories.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No articles available yet.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {categories.map((group) => (
            <Card key={group.category}>
              <CardHeader>
                <CardTitle>{group.category}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {group.articles.map((article) => (
                    <Link
                      key={article.id}
                      href={`/client-portal/knowledge-base/${article.id}`}
                      className="flex items-center justify-between p-2 hover:bg-muted rounded-md transition-colors"
                    >
                      <span>{article.title}</span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
} 