import { Ticket, getAttachmentUrl } from '@/services/tickets'
import { TICKET_PRIORITIES, TICKET_STATUSES } from '@/config/tickets'
import { useState } from 'react'

interface TicketDetailsProps {
  ticket: Ticket
  onClose: () => void
}

export function TicketDetails({ ticket, onClose }: TicketDetailsProps) {
  const [attachmentUrls, setAttachmentUrls] = useState<Record<string, string>>({})

  // Get attachment URL and cache it
  async function handleGetAttachmentUrl(path: string) {
    if (attachmentUrls[path]) return attachmentUrls[path]
    
    const url = await getAttachmentUrl(path)
    setAttachmentUrls(prev => ({ ...prev, [path]: url }))
    return url
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