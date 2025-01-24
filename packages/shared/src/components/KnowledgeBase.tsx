import { useState } from 'react'
import { Plus, Search } from 'lucide-react'
import { Database } from '../types/database'

type KBArticle = Database['public']['Tables']['knowledge_base_articles']['Row']

interface KnowledgeBaseProps {
  articles: KBArticle[]
  isLoading: boolean
  error: string | null
  showNewButton?: boolean
  onNewArticle?: () => void
  onArticleClick?: (article: KBArticle) => void
}

export function KnowledgeBase({
  articles,
  isLoading,
  error,
  showNewButton = false,
  onNewArticle,
  onArticleClick
}: KnowledgeBaseProps) {
  const [searchQuery, setSearchQuery] = useState('')

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error}
        </div>
      </div>
    )
  }

  const filteredArticles = articles.filter(article =>
    article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    article.content.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Knowledge Base</h1>
        {showNewButton && (
          <button
            onClick={onNewArticle}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Plus className="h-5 w-5 mr-2" />
            New Article
          </button>
        )}
      </div>

      {/* Search Bar */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          placeholder="Search articles..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
        />
      </div>

      {/* Articles List */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {filteredArticles.map((article) => (
            <li 
              key={article.id}
              onClick={() => onArticleClick?.(article)}
              className={onArticleClick ? 'cursor-pointer' : undefined}
            >
              <div className="px-4 py-4 sm:px-6 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-medium text-gray-900 truncate">
                      {article.title}
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                      {article.content.substring(0, 200)}...
                    </p>
                  </div>
                  <div className="ml-4 flex-shrink-0">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      article.is_published 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {article.is_published ? 'Published' : 'Draft'}
                    </span>
                  </div>
                </div>
                <div className="mt-2 sm:flex sm:justify-between">
                  <div className="sm:flex">
                    <p className="flex items-center text-sm text-gray-500">
                      {article.category}
                    </p>
                  </div>
                  <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                    <p>
                      Updated {new Date(article.updated_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
} 