import {
  Dialog,
  DialogContent,
  DialogOverlay,
  DialogPortal,
} from 'shared/src/components/ui/dialog'
import { KBArticleViewer } from 'shared/src/components/KBArticleViewer'
import { Database } from 'shared/src/types/database'

type KBArticle = Database['public']['Tables']['knowledge_base_articles']['Row']

interface ArticleModalProps {
  article: KBArticle | null
  isOpen: boolean
  onClose: () => void
  onEdit: (article: KBArticle) => void
}

export function ArticleModal({ 
  article, 
  isOpen, 
  onClose,
  onEdit 
}: ArticleModalProps) {
  if (!article) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogPortal>
        <DialogOverlay className="bg-black/50" />
        <DialogContent className="sm:max-w-4xl">
          <KBArticleViewer 
            article={article} 
            isEditable={true}
            onEdit={() => onEdit(article)}
          />
        </DialogContent>
      </DialogPortal>
    </Dialog>
  )
} 