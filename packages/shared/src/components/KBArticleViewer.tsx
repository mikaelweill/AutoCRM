import { Database } from '../types/database'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'

type KBArticle = Database['public']['Tables']['knowledge_base_articles']['Row']

interface KBArticleViewerProps {
  article: KBArticle
  isEditable?: boolean
  onEdit?: () => void
}

export function KBArticleViewer({ 
  article, 
  isEditable = false,
  onEdit 
}: KBArticleViewerProps) {
  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader className="space-y-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-2xl">{article.title}</CardTitle>
          {isEditable && (
            <button
              onClick={onEdit}
              className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-500"
            >
              Edit
            </button>
          )}
        </div>
        <div className="flex items-center space-x-4 text-sm text-gray-500">
          <span>{article.category}</span>
          <span>•</span>
          <span>Updated {new Date(article.updated_at).toLocaleDateString()}</span>
          <span>•</span>
          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
            article.is_published 
              ? 'bg-green-100 text-green-800' 
              : 'bg-yellow-100 text-yellow-800'
          }`}>
            {article.is_published ? 'Published' : 'Draft'}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="prose max-w-none">
          {/* We'll want to render this as markdown eventually */}
          {article.content.split('\n').map((paragraph, index) => (
            <p key={index} className="mb-4">
              {paragraph}
            </p>
          ))}
        </div>
      </CardContent>
    </Card>
  )
} 