# AI Features Documentation

## Current Implementation Status

### Phase 1: Core AI Pipeline
We are implementing a RAG-enhanced multi-LLM pipeline with integrated agent expertise tracking:

```typescript
// High-level flow
Ticket → RAG Context (with Agent Expertise) → LLM Pipeline → Decision
```

#### 1. RAG Implementation
```typescript
interface RagResult {
  // Similar tickets with full context
  similarTickets: Array<{
    ticket: Ticket;
    similarity: number;
    resolution?: string;
    comments: TicketComment[];  // Including full conversation history
  }>;
  
  // Expert agents for this type of ticket
  expertAgents: Array<{
    agent_id: string;
    similar_tickets_handled: number;  // Track record with similar issues
  }>;

  // Other context
  relevantDocs: Array<{
    content: string;
    source: string;
    similarity: number;
  }>;
  knowledgeBase: Array<{
    article: string;
    content: string;
    similarity: number;
  }>;
}
```

**Vector Storage Strategy:**
1. Initial data migration via SQL for historical tickets
2. Ongoing updates:
   - Create vector on new ticket
   - Delete and recreate vector when comments added
   - Each vector includes: title + description + priority + all comments

#### 2. LLM Pipeline
Three specialized models working in sequence:

1. **Evaluator LLM** (Implemented)
   - Fast initial assessment
   - Uses GPT-4-turbo
   - Determines complexity and type
   ```typescript
   interface EvaluatorOutput {
     ticketType: string;
     complexity: 'simple' | 'medium' | 'complex';
     relevantContext: string[];
     reasoning: string;
     confidence: number;
   }
   ```

2. **Responder LLM** (Next Step)
   - Generates detailed response
   - Uses full context including similar resolutions
   - Includes citations and sources

3. **QA LLM** (Final Step)
   - Validates response quality
   - Makes final human vs AI decision
   - Verifies source citations

### Immediate Next Steps

1. **Vector Database Setup**
   - Enable pgvector in Supabase
   - Create embeddings table
   - Write migration for historical data
   - Implement real-time vector updates

2. **Agent Expertise Integration**
   - Track similar tickets handled
   - Integrate with RAG results
   - Use for future agent recommendations

3. **Testing & Validation**
   - Unit tests for each component
   - Integration tests
   - Performance benchmarking
   - Accuracy metrics

### Success Metrics
- RAG relevancy > 0.8
- Evaluator accuracy > 90%
- End-to-end latency < 5s
- Citation accuracy > 95%
- Agent expertise correlation > 0.7

// ... rest of existing documentation ... 