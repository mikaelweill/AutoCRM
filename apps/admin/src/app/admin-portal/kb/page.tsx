'use client'

import { useState, useEffect } from 'react'
import { createClient } from 'shared/src/lib/supabase'
import { KnowledgeBase } from 'shared/src/components/KnowledgeBase'
import { Database } from 'shared/src/types/database'
import { Dialog } from 'shared/src/components/ui/Dialog'
import { KBArticleViewer } from 'shared/src/components/KBArticleViewer'
import { KBArticleEditor } from 'shared/src/components/KBArticleEditor'

type KBArticle = Database['public']['Tables']['knowledge_base_articles']['Row']

export default function KBPage() {
  const [articles, setArticles] = useState<KBArticle[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedArticle, setSelectedArticle] = useState<KBArticle | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  
  const supabase = createClient()

  useEffect(() => {
    fetchArticles()
  }, [])

  async function fetchArticles() {
    try {
      const { data, error } = await supabase
        .from('knowledge_base_articles')
        .select<'*', KBArticle>('*')
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

  const handleNewArticle = () => {
    // TODO: Implement new article creation
    console.log('New article clicked')
  }

  const handleArticleClick = (article: KBArticle) => {
    setSelectedArticle(article)
    setIsEditing(false)
  }

  const handleEditArticle = (article: KBArticle) => {
    setIsEditing(true)
  }

  const handleSaveArticle = async (updatedArticle: Partial<KBArticle>) => {
    if (!selectedArticle) return

    try {
      const { data, error } = await supabase
        .from('knowledge_base_articles')
        .update(updatedArticle)
        .eq('id', selectedArticle.id)
        .select<'*', KBArticle>('*')
        .single()

      if (error) throw error

      // Update the articles list with the updated article
      setArticles(articles.map(article => 
        article.id === selectedArticle.id ? data : article
      ))

      // Update the selected article and exit edit mode
      setSelectedArticle(data)
      setIsEditing(false)
    } catch (err) {
      console.error('Error updating article:', err)
      alert('Failed to update article')
    }
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
  }

  return (
    <>
      <KnowledgeBase
        articles={articles}
        isLoading={loading}
        error={error}
        showNewButton={true}
        onNewArticle={handleNewArticle}
        onArticleClick={handleArticleClick}
      />

      {selectedArticle && (
        <Dialog 
          isOpen={true}
          onClose={() => {
            setSelectedArticle(null)
            setIsEditing(false)
          }}
          title={isEditing ? 'Edit Article' : selectedArticle.title}
        >
          <div className="max-w-4xl mx-auto">
            {isEditing ? (
              <KBArticleEditor
                article={selectedArticle}
                onSave={handleSaveArticle}
                onCancel={handleCancelEdit}
              />
            ) : (
              <KBArticleViewer
                article={selectedArticle}
                isEditable={true}
                onEdit={() => handleEditArticle(selectedArticle)}
              />
            )}
          </div>
        </Dialog>
      )}
    </>
  )
} 