'use client'

import { useState, useEffect } from 'react'
import { Ticket, TicketActivity, addTicketReply, getAttachmentUrl } from '../../services/tickets'
import { TICKET_PRIORITIES, TICKET_STATUSES, TicketPriority, TicketStatus } from '../../config/tickets'
import { Button } from '../ui/Button'
import { Textarea } from '../ui/Textarea'
import { createClient } from '../../lib/supabase'

// Helper functions for getting colors
function getPriorityColor(priority: TicketPriority): string {
  return TICKET_PRIORITIES.find(p => p.value === priority)?.badgeColor || 'bg-gray-100 text-gray-800'
}

function getStatusColor(status: TicketStatus): string {
  return TICKET_STATUSES.find(s => s.value === status)?.color || 'bg-gray-100 text-gray-800'
}

interface TicketDetailsProps {
  ticket: Ticket
  onClose: () => void
  onCancel?: (ticketId: string) => Promise<void>
  onAssign?: (ticketId: string) => Promise<void>
  isCancelling?: boolean
  getAttachmentUrl?: (path: string) => Promise<string>
}

// Type guard for ticket activity
function isTicketActivity(data: unknown): data is TicketActivity {
  const activity = data as TicketActivity
  return (
    typeof activity === 'object' &&
    activity !== null &&
    typeof activity.id === 'string' &&
    typeof activity.ticket_id === 'string' &&
    typeof activity.user_id === 'string' &&
    typeof activity.activity_type === 'string' &&
    typeof activity.created_at === 'string'
  )
}

export function TicketDetails({ 
  ticket, 
  onClose,
  onCancel,
  onAssign,
  isCancelling,
  getAttachmentUrl: externalGetAttachmentUrl
}: TicketDetailsProps) {
  const [attachmentUrls, setAttachmentUrls] = useState<Record<string, string>>({})
  const [activities, setActivities] = useState<TicketActivity[]>([])
  const [replyContent, setReplyContent] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [currentUser, setCurrentUser] = useState<{ id: string } | null>(null)
  const supabase = createClient()

  // Get current user
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setCurrentUser(user)
      }
    })
  }, [])

  // Get attachment URL and cache it
  async function handleGetAttachmentUrl(path: string) {
    if (externalGetAttachmentUrl) {
      return externalGetAttachmentUrl(path)
    }

    if (attachmentUrls[path]) return attachmentUrls[path]
    
    const url = await getAttachmentUrl(path)
    setAttachmentUrls(prev => ({ ...prev, [path]: url }))
    return url
  }

  // Subscribe to new activities
  useEffect(() => {
    // Fetch existing activities first
    supabase
      .from('ticket_activities')
      .select('*, user:users(*)')
      .eq('ticket_id', ticket.id)
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        if (data) {
          // First cast to unknown, then filter with type guard
          const unknownData = data as unknown
          const validActivities = (unknownData as any[]).filter(isTicketActivity)
          if (validActivities.length !== data.length) {
            console.warn('Some activities failed type validation')
          }
          setActivities(validActivities)
        }
      })

    // Then set up subscription
    const channel = supabase
      .channel(`ticket-${ticket.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'ticket_activities',
          filter: `ticket_id=eq.${ticket.id}`
        },
        async (payload) => {
          // Fetch the complete activity with user data
          const { data } = await supabase
            .from('ticket_activities')
            .select('*, user:users(*)')
            .eq('id', payload.new.id)
            .single()
          
          if (data) {
            // Cast through unknown first
            const unknownData = data as unknown
            if (isTicketActivity(unknownData)) {
              setActivities(prev => [...prev, unknownData])
            }
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [ticket.id, supabase])

  // Handle reply submission
  async function handleSubmitReply(e: React.FormEvent) {
    e.preventDefault()
    if (!replyContent.trim() || isSubmitting) return

    setIsSubmitting(true)
    try {
      await addTicketReply(ticket.id, replyContent.trim())
      setReplyContent('')
    } catch (error) {
      console.error('Failed to add reply:', error)
      alert('Failed to add reply. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Check if current user is the assigned agent
  const isAssignedAgent = currentUser && ticket.agent_id === currentUser.id

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-medium text-gray-900">
          #{ticket.number} {ticket.subject}
        </h3>
        <div className="mt-2 flex items-center gap-2">
          <span className={`${getPriorityColor(ticket.priority)} px-2.5 py-0.5 rounded-full text-sm font-medium`}>
            {TICKET_PRIORITIES.find(p => p.value === ticket.priority)?.label || ticket.priority}
          </span>
          <span className={`${getStatusColor(ticket.status)} px-2.5 py-0.5 rounded-full text-sm font-medium`}>
            {TICKET_STATUSES.find(s => s.value === ticket.status)?.label || ticket.status}
          </span>
        </div>
      </div>

      {/* Description */}
      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-2">Description</h4>
        <p className="text-sm text-gray-600 whitespace-pre-wrap">
          {ticket.description}
        </p>
      </div>

      {/* Attachments */}
      {ticket.attachments && ticket.attachments.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">Attachments</h4>
          <div className="flex flex-wrap gap-2">
            {ticket.attachments.map((attachment) => (
              <a
                key={attachment.id}
                href={attachmentUrls[attachment.storage_path] || '#'}
                onClick={async (e) => {
                  e.preventDefault()
                  window.open(
                    await handleGetAttachmentUrl(attachment.storage_path),
                    '_blank'
                  )
                }}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-blue-600 hover:text-blue-700 hover:underline bg-blue-50 rounded-lg"
              >
                {attachment.file_name}
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Activities/Replies */}
      <div className="border-t pt-4">
        <h4 className="text-sm font-medium text-gray-700 mb-4">Replies</h4>
        <div className="space-y-4">
          {activities.map((activity) => (
            <div key={activity.id} className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-900">
                  {activity.user.full_name || activity.user.email}
                </span>
                <span className="text-xs text-gray-500">
                  {new Date(activity.created_at).toLocaleString()}
                </span>
              </div>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">
                {activity.content}
              </p>
            </div>
          ))}
        </div>

        {/* Reply Form - Only show if user is assigned agent */}
        {isAssignedAgent ? (
          <form onSubmit={handleSubmitReply} className="mt-4">
            <Textarea
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              placeholder="Add a reply..."
              className="mb-2"
              rows={3}
            />
            <div className="flex justify-between">
              <Button
                type="submit"
                disabled={!replyContent.trim() || isSubmitting}
                loading={isSubmitting}
              >
                Add Reply
              </Button>
              {onCancel && ticket.status !== 'cancelled' && (
                <Button
                  type="button"
                  variant="danger"
                  onClick={() => onCancel(ticket.id)}
                  disabled={isCancelling}
                  loading={isCancelling}
                >
                  Cancel Ticket
                </Button>
              )}
            </div>
          </form>
        ) : (
          // Show assign button if ticket is unassigned
          !ticket.agent_id && onAssign && (
            <div className="mt-4 flex justify-center">
              <Button onClick={() => onAssign(ticket.id)}>
                Assign to Me to Reply
              </Button>
            </div>
          )
        )}
      </div>

      {/* Metadata */}
      <div className="border-t pt-4 text-sm text-gray-500">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <span className="font-medium">Created by: </span>
            {ticket.client.full_name || ticket.client.email}
          </div>
          {ticket.agent && (
            <div>
              <span className="font-medium">Assigned to: </span>
              {ticket.agent.full_name || ticket.agent.email}
            </div>
          )}
          <div>
            <span className="font-medium">Created: </span>
            {new Date(ticket.created_at).toLocaleString()}
          </div>
          <div>
            <span className="font-medium">Last updated: </span>
            {new Date(ticket.updated_at).toLocaleString()}
          </div>
        </div>
      </div>
    </div>
  )
} 