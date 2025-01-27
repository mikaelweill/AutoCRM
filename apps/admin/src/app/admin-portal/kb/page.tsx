'use client'

import { useState, useEffect } from 'react'
import { createClient } from 'shared/src/lib/supabase'
import { KnowledgeBase } from 'shared/src/components/KnowledgeBase'
import { Database } from 'shared/src/types/database'
import { Dialog } from 'shared/src/components/ui/Dialog'
import { KBArticleViewer } from 'shared/src/components/KBArticleViewer'
import { KBArticleEditor } from 'shared/src/components/KBArticleEditor'
import { useAuth } from 'shared/src/contexts/AuthContext'

type KBArticle = Database['public']['Tables']['knowledge_base_articles']['Row']

export default function KBPage() {
  const [articles, setArticles] = useState<KBArticle[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedArticle, setSelectedArticle] = useState<KBArticle | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  
  const supabase = createClient()
  const { user } = useAuth()

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
    setIsCreating(true)
  }

  const handleArticleClick = (article: KBArticle) => {
    setSelectedArticle(article)
    setIsEditing(false)
  }

  const handleEditArticle = (article: KBArticle) => {
    setIsEditing(true)
  }

  const handleSaveArticle = async (updatedArticle: Partial<KBArticle>) => {
    if (!selectedArticle || !user) return

    try {
      const { data, error } = await supabase
        .from('knowledge_base_articles')
        .update({
          ...updatedArticle,
          updated_at: new Date().toISOString(),
          last_updated_by: user.id
        })
        .eq('id', selectedArticle.id)
        .select<'*', KBArticle>('*')
        .single()

      if (error) {
        console.error('Error updating article:', error)
        throw new Error(error.message)
      }

      if (!data) {
        throw new Error('No data returned after update')
      }

      // Update the articles list with the updated article
      setArticles(articles.map(article => 
        article.id === selectedArticle.id ? data : article
      ))

      // Update the selected article and exit edit mode
      setSelectedArticle(data)
      setIsEditing(false)

      // Generate embedding for updated article in the background
      fetch('/api/kb-embeddings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: data.id,
          title: data.title,
          content: data.content,
          category: data.category
        })
      }).catch(err => {
        console.error('Error generating embeddings:', err)
        // We don't throw here since it's a background operation
      })

    } catch (err) {
      console.error('Error updating article:', err)
      alert(err instanceof Error ? err.message : 'Failed to update article')
    }
  }

  const handleCreateArticle = async (newArticle: Partial<KBArticle>) => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('knowledge_base_articles')
        .insert({
          ...newArticle,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          created_by: user.id,
          last_updated_by: user.id,
          metadata: {}
        })
        .select<'*', KBArticle>('*')
        .single()

      if (error) {
        console.error('Error creating article:', error)
        throw new Error(error.message)
      }

      if (!data) {
        throw new Error('No data returned after insert')
      }

      // Add the new article to the list
      setArticles([data, ...articles])

      // Close the create dialog
      setIsCreating(false)

      // Generate embedding for new article in the background
      fetch('/api/kb-embeddings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: data.id,
          title: data.title,
          content: data.content,
          category: data.category
        })
      }).catch(err => {
        console.error('Error generating embeddings:', err)
        // We don't throw here since it's a background operation
      })

    } catch (err) {
      console.error('Error creating article:', err)
      alert(err instanceof Error ? err.message : 'Failed to create article')
    }
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
  }

  const handleCancelCreate = () => {
    setIsCreating(false)
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

      {/* Article View/Edit Dialog */}
      {selectedArticle && (
        <Dialog 
          isOpen={true}
          onClose={() => {
            setSelectedArticle(null)
            setIsEditing(false)
          }}
          title={isEditing ? 'Edit Article' : selectedArticle.title}
          className="w-full max-w-[90vw] h-[90vh] overflow-y-auto"
        >
          <div className="h-full">
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

      {/* Create Article Dialog */}
      <Dialog
        isOpen={isCreating}
        onClose={handleCancelCreate}
        title="Create New Article"
        className="w-full max-w-[90vw] h-[90vh] overflow-y-auto"
      >
        <div className="h-full">
          <KBArticleEditor
            onSave={handleCreateArticle}
            onCancel={handleCancelCreate}
          />
        </div>
      </Dialog>
    </>
  )
} 