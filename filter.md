# Ticket Filtering Implementation Plan

## Current State
- Client portal has hardcoded filters (status !== 'cancelled')
- Agent portal lacks filtering
- `TicketFilters` component exists but not fully integrated
- `TicketTemplate` handles display of individual tickets

## Implementation Plan

### 1. Create Shared TicketList Component
```typescript
// packages/shared/src/components/tickets/TicketList.tsx
interface TicketListProps {
  tickets: Ticket[]
  onTicketClick?: (ticket: Ticket) => void
  renderActions?: (ticket: Ticket) => React.ReactNode
  getAttachmentUrl?: (path: string) => Promise<string>
}
```

### 2. Modify Data Fetching
- Remove hardcoded filters from base queries
- Client Portal: Fetch all user's tickets
- Agent Portal: Fetch assigned + available tickets
- Admin Portal: Fetch all tickets

### 3. Filter State Management
```typescript
interface FilterState {
  statuses: TicketStatus[]
  priorities: TicketPriority[]
  searchTerm: string
  dateRange?: {
    start: Date
    end: Date
  }
}
```

### 4. Implementation Steps

1. **Phase 1: Basic Integration**
   - [ ] Create `TicketList` component
   - [ ] Move filtering logic to client-side
   - [ ] Integrate `TicketFilters` with `TicketList`
   - [ ] Add basic filter state management

2. **Phase 2: Enhanced Filtering**
   - [ ] Add search functionality
   - [ ] Add date range filtering
   - [ ] Add filter presets (Active, Closed, etc.)
   - [ ] Add "Select All/None" options

3. **Phase 3: UX Improvements**
   - [ ] Add URL parameter sync for shareable filtered views
   - [ ] Add filter persistence (localStorage)
   - [ ] Add loading states
   - [ ] Add empty states for filtered results

### 5. Component Structure
```
TicketList (Container)
├── TicketFilters
│   ├── StatusFilters
│   ├── PriorityFilters
│   ├── SearchInput
│   └── DateRangePicker
└── TicketGrid
    └── TicketTemplate (existing)
```

### 6. Filter Logic Example
```typescript
const filterTickets = (tickets: Ticket[], filters: FilterState) => {
  return tickets.filter(ticket => {
    const matchesStatus = filters.statuses.length === 0 || filters.statuses.includes(ticket.status)
    const matchesPriority = filters.priorities.length === 0 || filters.priorities.includes(ticket.priority)
    const matchesSearch = !filters.searchTerm || 
      ticket.subject.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
      ticket.description.toLowerCase().includes(filters.searchTerm.toLowerCase())
    
    return matchesStatus && matchesPriority && matchesSearch
  })
}
```

## Next Steps
1. Create `TicketList` component
2. Modify existing portal pages to use new component
3. Remove hardcoded filters from queries
4. Implement basic filter state management
5. Add enhanced filtering features

## Questions to Consider
- Should we implement server-side search for large datasets?
- Do we need to implement pagination?
- Should filter preferences be user-specific?
- How should we handle mobile view of filters? 