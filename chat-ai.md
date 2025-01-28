# Chat AI System Documentation

## System Overview

The Chat AI system provides agents with an intuitive interface to interact with an AI assistant that can perform ticket management actions and provide RAG-enhanced responses.

### Chat Context Strategy
```typescript
// Simple Persistent Chat Implementation

// 1. User Preferences in Supabase
interface UserPreferences {
  chat_is_open: boolean
  // other preferences...
}

// 2. Chat State Management
interface ChatState {
  isOpen: boolean
  activeTicketId?: string
  messages: ChatMessage[]
}

// 3. Layout Integration (agent-portal/layout.tsx)
<div className="relative min-h-screen">
  <main>{children}</main>
  <div className={cn(
    "fixed bottom-4 right-4 z-50 transition-all",
    chatState.isOpen ? "w-96 h-[600px]" : "w-12 h-12"
  )}>
    <ChatWindow 
      isOpen={chatState.isOpen}
      onToggle={() => updateAndSaveState()}
    />
  </div>
</div>
```

The chat will be implemented as a floating window that:
1. Persists across page navigation
2. Maintains open/closed state in user preferences
3. Saves conversation history in Supabase
4. Adapts to current page context automatically

Benefits:
- Simple implementation
- Consistent user experience
- State persistence
- Non-intrusive design

```
Agent Chat Interface
    │
    ├── AI Assistant with Tools
    │   ├── Ticket Management
    │   │   ├── Claim Ticket
    │   │   ├── Unclaim Ticket
    │   │   └── Respond to Ticket
    │   └── RAG-Enhanced Responses
    │       ├── KB Articles
    │       └── Past Tickets
    │
    ├── Action Tracking (Supabase)
    │   ├── Tool/Action Used
    │   ├── Timestamp
    │   ├── Agent ID
    │   ├── Latency
    │   ├── Success Status
    │   └── Agent Feedback
    │
    └── Admin Analytics
        ├── Action History
        ├── Performance Metrics
        └── LangSmith Traces
```

## Core Features

### 1. Chat Interface
- Natural language interaction with AI
- Persistent chat history
- Real-time status updates
- Quick action buttons for common requests

### 2. AI Tools (via LangSmith)
- **Ticket Management**
  - Claim/unclaim tickets
  - Generate responses
  - Search similar tickets
- **RAG Integration**
  - KB article search
  - Past ticket analysis
  - Context-aware responses

### 3. Action Tracking
```typescript
// Simplified schema that leverages LangSmith for detailed action tracking
interface ChatMessage {
  id: string              // UUID primary key
  agent_id: string        // Reference to auth.users
  session_id: string      // Group messages in conversations
  content: string         // The actual message content
  sender: 'agent' | 'assistant'  // Who sent the message
  langsmith_trace_id?: string    // Only present when AI performs actions
  success?: boolean             // Only for validated AI actions
  created_at: Date
}
```

Message Types Flow:
1. Regular Chat Messages:
   - Basic fields only (id, agent_id, session_id, content, sender)
   - No trace_id or success status needed

2. AI Action Messages:
   - Include langsmith_trace_id for action tracking
   - LangSmith handles detailed action logging
   - Success starts as null until validated

3. Validated Actions:
   - Success boolean updated after agent verification
   - Full trace available in LangSmith for debugging

This simplified schema leverages LangSmith's capabilities for detailed action tracking while maintaining just the essential data in our database.

### 4. Admin Portal
- Comprehensive action history
- Performance metrics dashboard
- LangSmith trace integration
- Agent feedback analysis

## AI Assistant Flow

### 1. Graph-Based Processing
The system uses a directed graph structure for message processing:

```
Input Node
    │
    ├─→ Decision Node
    │       │
    │       ├─→ Direct Response Node ─→ END
    │       │
    │       ├─→ Ticket Action Node ─→ Response Node ─→ END
    │       │
    │       └─→ RAG Node ─→ Decision Node
    │               │            │
    │               │            ├─→ Response Node ─→ END
    │               │            │
    │               │            └─→ Ticket Action Node ─→ Response Node ─→ END
    │               │
    │               └─→ Response Node ─→ END
```

### 2. Node Types

1. **Input Node**
   - Receives user message
   - Performs initial message parsing
   - Routes to Decision Node

2. **Decision Node**
   - Classifies request type:
     * Pure conversation (direct response)
     * Ticket action needed
     * Information lookup needed (RAG)
   - Routes to appropriate node based on classification

3. **RAG Node**
   - Performs vector search
   - Retrieves relevant documents
   - Formats search results
   - Can route to:
     * Response Node (if information is sufficient)
     * Ticket Action Node (if action needed based on information)

4. **Ticket Action Node**
   - Performs ticket operations:
     * Update status
     * Add comments
     * Change priority
     * Assign/unassign
   - Always routes to Response Node

5. **Response Node**
   - Formats final response
   - Includes:
     * Direct answers
     * Search results (if from RAG)
     * Action confirmations (if from Ticket Action)
   - Terminates the flow

### 3. Edge Conditions

1. **RAG → Decision**
   - If search results indicate action needed
   - If additional context required

2. **Decision → Response**
   - If simple question/greeting
   - If no action or search needed

3. **Decision → Ticket Action**
   - If clear ticket action requested
   - If permissions verified

4. **Decision → RAG**
   - If information lookup needed
   - If context required for action

### 4. Implementation Details

```typescript
interface Node {
  process: (input: any) => Promise<NodeResult>
  getNextNode: (result: NodeResult) => Node | null
}

interface NodeResult {
  output: any
  metadata: {
    requiresAction?: boolean
    requiresSearch?: boolean
    confidence: number
  }
}

class DecisionNode implements Node {
  async process(input: string): Promise<NodeResult> {
    // Classify input and determine next step
    return {
      output: classificationResult,
      metadata: {
        requiresAction: boolean,
        requiresSearch: boolean,
        confidence: number
      }
    }
  }

  getNextNode(result: NodeResult): Node {
    if (result.metadata.requiresSearch) return new RAGNode()
    if (result.metadata.requiresAction) return new TicketActionNode()
    return new ResponseNode()
  }
}
```

## Implementation Plan

### Phase 1: Basic Chat Infrastructure 🎯
- Chat interface implementation
- Basic ticket management tools
- Initial action tracking
- Core database schema

### Phase 2: RAG Integration
- KB article search integration
- Similar ticket search
- Context-aware response generation
- Enhanced tool reliability

### Phase 3: Analytics & Monitoring
- LangSmith integration
- Admin dashboard development
- Performance tracking implementation
- Feedback system setup

### Phase 4: Refinement
- UI/UX improvements
- Performance optimization
- Advanced features
- Enhanced error handling

## Technical Considerations

### Performance
- Real-time chat updates
- Efficient RAG query processing
- Action tracking overhead
- Chat history management

### Security
- Agent authentication
- Action authorization
- Data access controls
- Audit logging

### Scalability
- Chat history retention
- Action log growth
- Performance at scale
- Resource utilization

## Success Metrics

### Technical Metrics
- Tool execution success rate
- Average response latency
- System uptime
- Error rate

### User Experience Metrics
- Agent satisfaction
- Tool usage frequency
- Task completion rate
- Feature adoption

### Business Metrics
- Time saved per ticket
- Agent efficiency
- Successful actions ratio
- ROI on AI operations

## Current Progress
- ✅ Created minimalist chat UI component with:
  - Collapsible window
  - Message history
  - Input field with send button
  - Basic styling
- ✅ Implemented UI-level authentication:
  - Added to agent portal layout
  - Protected by useAuth() and hasRequiredRole() checks
  - Only visible to authenticated agents
- ✅ Implemented basic chat functionality:
  - Message persistence in database
  - Real-time message sending
  - Proper message formatting with timestamps
  - iPhone-style chat bubbles
  - Starts minimized by default
  - Smooth minimize/maximize transitions
- ✅ Set up AI Agent infrastructure:
  - Basic LangChain agent setup
  - Tool structure for RAG and ticket operations
  - Integration with chat API
  - Message classification system
- ✅ Implemented RAG functionality:
  - Vector search for KB articles and tickets
  - Proper typing and error handling
  - Similarity scoring and result ranking
- ✅ Enhanced AI Assistant capabilities:
  - Clear guidelines for RAG usage (MUST, MAY, DO NOT use cases)
  - Natural language response synthesis
  - Context-aware search behavior
  - Improved conversation flow

## Immediate Next Steps

### Phase 1: Response Enhancement
1. **Smart Response Processing**
   - Implement response templating system
   - Add support for rich text formatting
   - Handle multi-source information synthesis
   - Add citation links to sources

2. **Context Management**
   - Track conversation context across messages
   - Maintain reference to relevant tickets/articles
   - Handle context switching gracefully
   - Implement conversation memory

### Phase 2: Tool Integration
1. **Ticket Management Enhancement**
   - Complete ticket tool implementation
   - Add support for bulk operations
   - Implement ticket status tracking
   - Add validation and error handling

2. **RAG Optimization**
   - Implement caching for frequent searches
   - Add relevance scoring refinement
   - Optimize embedding generation
   - Add support for filtered searches

### Phase 3: UI/UX Improvements
1. **Interactive Elements**
   - Add quick action buttons
   - Implement suggestion chips
   - Add support for file attachments
   - Improve error state handling

2. **Visual Feedback**
   - Add progress indicators for long operations
   - Implement typing indicators
   - Add visual cues for tool usage
   - Improve loading states

### Technical Priorities
1. **Performance**
   - Optimize RAG search latency
   - Implement response streaming
   - Add message pagination
   - Optimize state management

2. **Reliability**
   - Add comprehensive error handling
   - Implement retry mechanisms
   - Add fallback responses
   - Improve logging and monitoring

3. **Security**
   - Implement rate limiting
   - Add input validation
   - Enhance authentication checks
   - Add audit logging

## Success Metrics
- Response accuracy (comparing RAG results with user feedback)
- Tool usage efficiency (tracking successful vs failed operations)
- Conversation quality (measuring natural flow and context retention)
- User satisfaction (tracking feedback and usage patterns)

## Security Implementation Plan
1. **UI Protection (Completed)**
   - Chat window only renders for authenticated agents
   - Layout-level authentication checks
   - Redirect unauthorized users

2. **API Security (Next Steps)**
   - Create authenticated API endpoints for chat operations
   - JWT token validation
   - Server-side role verification
   - Rate limiting for message sending

3. **Database Security (Next Steps)**
   - Implement RLS policies for chat data
   - Set up proper table relationships
   - Role-based access control
   - Foreign key constraints

## Next Steps
1. Design and implement secure API endpoints for chat operations
2. Set up database schema with RLS policies
3. Connect UI to secured backend
4. Add rate limiting and monitoring

## Technical Considerations
- Keep chat state persistent across page navigation
- Ensure proper error handling
- Monitor API endpoint usage
- Implement proper logging for security events

## Success Metrics
- Successful role-based access control
- No unauthorized access to chat functionality
- Smooth user experience for agents
- Proper error handling and feedback 