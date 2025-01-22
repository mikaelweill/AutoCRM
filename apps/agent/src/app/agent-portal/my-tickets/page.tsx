import { MyTickets } from 'shared/src/components/tickets/MyTickets'

export default function MyTicketsPage() {
  return (
    <div className="h-full overflow-auto">
      <div className="max-w-3xl mx-auto p-6">
        <h1 className="text-2xl font-semibold mb-6">My Tickets</h1>
        <MyTickets />
      </div>
    </div>
  )
} 