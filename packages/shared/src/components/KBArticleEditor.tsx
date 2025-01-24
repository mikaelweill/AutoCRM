import { useState } from 'react'
import { Database } from '../types/database'
import { Card, CardContent, CardHeader } from './ui/card'
import { Textarea } from './ui/Textarea'

type KBArticle = Database['public']['Tables']['knowledge_base_articles']['Row']

interface KBArticleEditorProps {
  article?: KBArticle
  onSave: (updatedArticle: Partial<KBArticle>) => Promise<void>
  onCancel: () => void
}

export function KBArticleEditor({ 
  article, 
  onSave,
  onCancel 
}: KBArticleEditorProps) {
  const [title, setTitle] = useState(article?.title ?? '')
  const [content, setContent] = useState(article?.content ?? '')
  const [category, setCategory] = useState(article?.category ?? '')
  const [isPublished, setIsPublished] = useState(article?.is_published ?? false)
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async () => {
    if (!title.trim()) {
      alert('Title is required')
      return
    }

    try {
      setIsSaving(true)
      await onSave({
        title: title.trim(),
        content: content.trim(),
        category: category.trim(),
        is_published: isPublished
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader className="space-y-4">
        <div className="space-y-4">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Article Title"
            className="w-full text-2xl font-bold border-0 border-b border-gray-200 focus:border-blue-500 focus:ring-0 px-0"
          />
          <input
            type="text"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="Category"
            className="w-full text-sm text-gray-500 border-0 border-b border-gray-200 focus:border-blue-500 focus:ring-0 px-0"
          />
          <div className="flex items-center space-x-4">
            <label className="flex items-center space-x-2 text-sm text-gray-500">
              <input
                type="checkbox"
                checked={isPublished}
                onChange={(e) => setIsPublished(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span>Published</span>
            </label>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="prose max-w-none">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write your article content here..."
            className="w-full min-h-[400px] border-0 focus:ring-0 text-base"
          />
        </div>
        <div className="mt-6 flex justify-end space-x-4">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-500"
            disabled={isSaving}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md shadow-sm disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : article ? 'Save Changes' : 'Create Article'}
          </button>
        </div>
      </CardContent>
    </Card>
  )
} 