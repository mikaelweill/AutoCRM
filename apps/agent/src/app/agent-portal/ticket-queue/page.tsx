import { TicketQueue } from 'shared/src/components/tickets/TicketQueue'

export default function TicketQueuePage() {
  return (
    <div className="h-full overflow-auto">
      <div className="max-w-3xl mx-auto p-6">
        <h1 className="text-2xl font-semibold mb-6">Ticket Queue</h1>
        <TicketQueue />
      </div>
    </div>
  )
} 