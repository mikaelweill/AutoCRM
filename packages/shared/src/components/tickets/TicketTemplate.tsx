'use client'

import React from 'react'
import { Ticket, TicketActivity } from '../../services/tickets'
import { TICKET_PRIORITIES, TICKET_STATUSES } from '../../config/tickets'
import { UserCircle, Clock, Send, MessageCircle } from 'lucide-react'
import { Button } from '../ui/Button'
import { useState, useEffect } from 'react'
import { createClient } from '../../lib/supabase'
import { addTicketReply } from '../../services/tickets'

interface TicketTemplateProps {
  ticket: Ticket
  // Core customization props
  onTicketClick?: (ticket: Ticket) => void
  getAttachmentUrl?: (path: string) => Promise<string>
  
  // Optional section customizations
  renderHeader?: (ticket: Ticket) => React.ReactNode
  renderMetadata?: (ticket: Ticket) => React.ReactNode
  renderActions?: (ticket: Ticket) => React.ReactNode
  
  // Optional flags
  hideDescription?: boolean
  hideAttachments?: boolean
  hideComments?: boolean
  readOnlyComments?: boolean
  isDetailView?: boolean
}

// Default section renderers
const DefaultHeader = ({ ticket, isDetailView }: { ticket: Ticket; isDetailView?: boolean }) => (
  <div>
    <h3 className="text-xl font-medium text-gray-900 px-1">
      {ticket.subject}
    </h3>
    <p className={`mt-2 text-sm text-gray-600 px-1 ${isDetailView ? 'whitespace-pre-wrap' : 'line-clamp-3'}`}>
      {ticket.description}
    </p>
  </div>
)

const DefaultMetadata = ({ ticket }: { ticket: Ticket }) => (
  <div className="space-y-2 text-sm text-gray-600">
    <div className="flex items-center gap-2">
      <UserCircle className="w-4 h-4" />
      <span>Created by: {ticket.client.full_name || ticket.client.email || 'Unknown'}</span>
    </div>
    <div className="flex items-center gap-2">
      <Clock className="w-4 h-4" />
      <span>Created date: {new Date(ticket.created_at).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })}</span>
    </div>
    {ticket.agent_id && (
      <div className="flex items-center gap-2">
        <UserCircle className="w-4 h-4" />
        <span>Assigned to: {ticket.agent?.full_name || ticket.agent?.email || 'Unknown'}</span>
      </div>
    )}
  </div>
)

interface Comment {
  id: string
  content: string
  created_at: string
  user: {
    email: string
    full_name?: string
  }
}

const CommentSection = ({ ticket, readOnly }: { ticket: Ticket; readOnly?: boolean }) => {
  const [newComment, setNewComment] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [comments, setComments] = useState<TicketActivity[]>([])
  const supabase = createClient()

  // Fetch existing comments and subscribe to new ones
  useEffect(() => {
    // Fetch existing comments
    supabase
      .from('ticket_activities')
      .select(`
        *,
        user:users(id, email, full_name)
      `)
      .eq('ticket_id', ticket.id)
      .eq('activity_type', 'comment')
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        if (data) {
          setComments(data as unknown as TicketActivity[])
        }
      })

    // Subscribe to new comments
    const channel = supabase
      .channel(`ticket-${ticket.id}-comments`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'ticket_activities',
          filter: `ticket_id=eq.${ticket.id} AND activity_type=eq.comment`
        },
        async (payload) => {
          // Fetch the complete comment with user data
          const { data } = await supabase
            .from('ticket_activities')
            .select(`
              *,
              user:users(id, email, full_name)
            `)
            .eq('id', payload.new.id)
            .single()
          
          if (data) {
            setComments(prev => [...prev, data as unknown as TicketActivity])
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [ticket.id])

  const handleSubmit = async () => {
    if (!newComment.trim() || isSubmitting) return

    setIsSubmitting(true)
    try {
      const newActivity = await addTicketReply(ticket.id, newComment)
      setComments(prev => [...prev, newActivity])
      setNewComment('')
    } catch (error) {
      console.error('Error submitting comment:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      <h4 className="font-medium text-gray-900">Comments</h4>
      
      {/* Comment List */}
      <div className="space-y-3">
        {comments.map(comment => (
          <div key={comment.id} className="bg-gray-50 rounded-lg p-3">
            <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
              <UserCircle className="w-4 h-4" />
              <span>{comment.user.full_name || comment.user.email}</span>
              <span className="text-gray-400">•</span>
              <span className="text-gray-400">
                {new Date(comment.created_at).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
            </div>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{comment.content}</p>
          </div>
        ))}
      </div>

      {/* New Comment Form - Only show if not read-only */}
      {!readOnly && (
        <div className="flex gap-2">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment..."
            className="flex-1 min-h-[80px] p-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <Button 
            onClick={handleSubmit}
            disabled={!newComment.trim() || isSubmitting}
            className="self-end"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      )}
      {readOnly && (
        <div className="text-sm text-gray-500 italic border rounded-lg p-3 bg-gray-50">
          Claim this ticket to add comments
        </div>
      )}
    </div>
  )
}

// Action button variants with consistent styling
export const ActionButton = {
  claim: ({ onClick, loading, children }: { onClick: (e: React.MouseEvent) => void, loading?: boolean, children: React.ReactNode }) => (
    <Button
      onClick={onClick}
      disabled={loading}
      variant="success"
    >
      {loading ? 'Loading...' : children}
    </Button>
  ),
  
  unclaim: ({ onClick, loading, children }: { onClick: (e: React.MouseEvent) => void, loading?: boolean, children: React.ReactNode }) => (
    <Button
      onClick={onClick}
      disabled={loading}
      variant="destructive"
    >
      {loading ? 'Loading...' : children}
    </Button>
  ),
  
  close: ({ onClick, loading, children }: { onClick: (e: React.MouseEvent) => void, loading?: boolean, children: React.ReactNode }) => (
    <Button
      onClick={onClick}
      disabled={loading}
      variant="success"
    >
      {loading ? 'Loading...' : children}
    </Button>
  ),
  
  cancel: ({ onClick, loading, children }: { onClick: (e: React.MouseEvent) => void, loading?: boolean, children: React.ReactNode }) => (
    <Button
      onClick={onClick}
      disabled={loading}
      variant="destructive"
    >
      {loading ? 'Loading...' : children}
    </Button>
  ),

  reopen: ({ onClick, loading, children }: { onClick: (e: React.MouseEvent) => void, loading?: boolean, children: React.ReactNode }) => (
    <Button
      onClick={onClick}
      disabled={loading}
      variant="success"
    >
      {loading ? 'Loading...' : children}
    </Button>
  )
}

export function TicketTemplate({
  ticket,
  onTicketClick,
  getAttachmentUrl,
  renderHeader = (ticket) => <DefaultHeader ticket={ticket} isDetailView={isDetailView} />,
  renderMetadata = (ticket) => <DefaultMetadata ticket={ticket} />,
  renderActions,
  hideDescription = false,
  hideAttachments = false,
  hideComments = false,
  readOnlyComments = false,
  isDetailView = false,
}: TicketTemplateProps) {
  const priorityColor = TICKET_PRIORITIES.find(p => p.value === ticket.priority)?.color || 'gray'
  
  return (
    <div 
      className={`bg-white shadow rounded-lg hover:shadow-md transition-all duration-200 border-l-4 border-${priorityColor}-400`}
      onClick={() => !isDetailView && onTicketClick?.(ticket)}
    >
      <div className={!isDetailView && onTicketClick ? "cursor-pointer" : ""}>
        {/* Header Section */}
        <div className="p-6">
          {renderHeader(ticket)}
        </div>

        {/* Divider */}
        <div className="border-t border-gray-100" />

        {/* Attachments Section */}
        {!hideAttachments && ticket.attachments && ticket.attachments.length > 0 && (
          <div className="px-6 py-3">
            <span className="text-gray-700 text-sm">Attachments:</span>
            <div className="flex flex-wrap gap-2 mt-2">
              {ticket.attachments.map((attachment) => (
                <a
                  key={attachment.id}
                  href="#"
                  onClick={async (e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    if (getAttachmentUrl) {
                      const url = await getAttachmentUrl(attachment.storage_path)
                      window.open(url, '_blank')
                    }
                  }}
                  className="inline-flex items-center gap-1 px-2 py-1 text-sm text-blue-600 hover:text-blue-700 hover:underline bg-blue-50 rounded"
                >
                  {attachment.file_name}
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Comments Section */}
        {isDetailView && !hideComments && (
          <div className="px-6 py-4 border-t border-gray-100">
            <CommentSection ticket={ticket} readOnly={readOnlyComments} />
          </div>
        )}

        {/* Metadata Section */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50">
          {renderMetadata(ticket)}
        </div>

        {/* Footer Section */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gradient-to-b from-gray-50/50 to-gray-100/50 rounded-b-lg flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">
              ID {ticket.number}
            </span>
            <span
              className={`${
                TICKET_STATUSES.find((s) => s.value === ticket.status)?.color || 'bg-gray-100 text-gray-800'
              } px-2.5 py-0.5 rounded-full text-sm font-medium`}
            >
              {TICKET_STATUSES.find(s => s.value === ticket.status)?.label || ticket.status}
            </span>
            <span
              className={`${
                TICKET_PRIORITIES.find((p) => p.value === ticket.priority)?.badgeColor || 'bg-gray-100 text-gray-800'
              } px-2.5 py-0.5 rounded-full text-sm font-medium`}
            >
              {TICKET_PRIORITIES.find(p => p.value === ticket.priority)?.label || ticket.priority}
            </span>
            {!isDetailView && ticket.activities && (
              <span className="bg-gray-100 text-gray-600 px-2.5 py-0.5 rounded-full text-sm font-medium flex items-center gap-1">
                <MessageCircle className="w-3.5 h-3.5" />
                {ticket.activities.filter(activity => activity.activity_type === 'comment').length}
              </span>
            )}
          </div>
          {renderActions && renderActions(ticket)}
        </div>
      </div>
    </div>
  )
} 