import { TicketQueue } from 'shared/src/components/tickets/TicketQueue'

export default function TicketQueuePage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-6">Ticket Queue</h1>
      <TicketQueue />
    </div>
  )
} 