import { Ticket, TicketActivity, addTicketReply, getAttachmentUrl } from '@/services/tickets'
import { TICKET_PRIORITIES, TICKET_STATUSES } from '@/config/tickets'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Textarea'
import { createClient } from '@/lib/supabase'

interface TicketDetailsProps {
  ticket: Ticket
  onClose: () => void
}

export function TicketDetails({ ticket, onClose }: TicketDetailsProps) {
  const [attachmentUrls, setAttachmentUrls] = useState<Record<string, string>>({})
  const [activities, setActivities] = useState<TicketActivity[]>([])
  const [replyContent, setReplyContent] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const supabase = createClient()

  // Get attachment URL and cache it
  async function handleGetAttachmentUrl(path: string) {
    if (attachmentUrls[path]) return attachmentUrls[path]
    
    const url = await getAttachmentUrl(path)
    setAttachmentUrls(prev => ({ ...prev, [path]: url }))
    return url
  }

  // Subscribe to new activities
  useEffect(() => {
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
        (payload) => {
          setActivities(prev => [...prev, payload.new as TicketActivity])
        }
      )
      .subscribe()

    // Fetch existing activities
    supabase
      .from('ticket_activities')
      .select('*, user:users(*)')
      .eq('ticket_id', ticket.id)
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        if (data) setActivities(data as TicketActivity[])
      })

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-medium text-gray-900">
          #{ticket.number} {ticket.subject}
        </h3>
        <div className="mt-2 flex items-center gap-2">
          <span className={`${
            TICKET_PRIORITIES.find((p) => p.value === ticket.priority)?.color
          } px-2.5 py-0.5 rounded-full text-sm font-medium`}>
            {ticket.priority}
          </span>
          <span className={`${
            TICKET_STATUSES.find((s) => s.value === ticket.status)?.color
          } px-2.5 py-0.5 rounded-full text-sm font-medium`}>
            {ticket.status.replace('_', ' ')}
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

        {/* Reply Form */}
        <form onSubmit={handleSubmitReply} className="mt-4">
          <Textarea
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
            placeholder="Add a reply..."
            className="mb-2"
            rows={3}
          />
          <Button
            type="submit"
            disabled={!replyContent.trim() || isSubmitting}
            loading={isSubmitting}
          >
            Add Reply
          </Button>
        </form>
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
          {ticket.resolved_at && (
            <div>
              <span className="font-medium">Resolved: </span>
              {new Date(ticket.resolved_at).toLocaleString()}
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 