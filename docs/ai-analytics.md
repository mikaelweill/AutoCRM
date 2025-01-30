# AI Analytics Implementation

## Database Structure

```sql
CREATE TABLE message_runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id UUID REFERENCES chat_messages(id) NOT NULL,
    langsmith_run_id TEXT,
    original_prompt TEXT,
    
    -- Commonly needed metrics from LangSmith
    token_usage JSONB,  -- {prompt_tokens, completion_tokens, total_tokens}
    latency INTEGER,    -- in milliseconds
    
    -- User feedback
    success BOOLEAN,    -- NULL until user provides feedback
    feedback_message TEXT,  -- Optional explanation if marked as failed
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Data Collection Strategy

### Core Fields (Initial Implementation)
1. **message_id**
   - Source: Created message ID from chat_messages table
   - When: After inserting the assistant's response message
   - In: `chat-messages/route.ts` POST endpoint

2. **langsmith_run_id**
   - Source: `agentResponse.trace_id` from processMessage
   - When: After agent processes the message
   - In: `chat-messages/route.ts` POST endpoint

3. **original_prompt**
   - Source: User's input message (`content` from request body)
   - When: When creating the message_run record
   - In: `chat-messages/route.ts` POST endpoint

4. **actions**
   - Source: TicketTool action logging in agent.ts
   - Implementation: Add action logging array in TicketTool class
   - Format: JSONB array of actions with timestamps
   ```json
   [
     {
       "type": "lookup",
       "ticket_id": "123",
       "timestamp": "2024-01-30T00:55:45.306Z",
       "result": "success",
       "details": "Found ticket #123"
     }
   ]
   ```

5. **success & feedback_message**
   - Source: User feedback through UI
   - When: When user marks message as success/failure
   - In: `chat-messages/route.ts` PATCH endpoint
   - Initially: NULL until user provides feedback

## Implementation Steps

1. **Database Setup**
   - Create the `message_runs` table
   - Enable RLS
   - Create admin view policy
   - Create appropriate indexes

2. **Code Changes Required**
   - Modify `processMessage` in `agent.ts`:
     ```typescript
     // Add to TicketTool class
     private actionLog: {
       type: string;
       ticket_id: string;
       timestamp: string;
       result: string;
       details: string;
     }[] = [];

     // Return in processMessage
     return {
       content: response,
       trace_id: runId,
       actions: ticketTool.getActionLog()
     }
     ```
   
   - Update `chat-messages/route.ts`:
     ```typescript
     // In POST endpoint
     const { data: aiMessage } = await supabase
       .from('chat_messages')
       .insert({...})
       .select()
       .single()

     // Create message_run record
     await supabase
       .from('message_runs')
       .insert({
         message_id: aiMessage.id,
         langsmith_run_id: agentResponse.trace_id,
         original_prompt: content,
         actions: agentResponse.actions
       })

     // In PATCH endpoint
     const { success, feedback_message } = await req.json()
     await supabase
       .from('message_runs')
       .update({ 
         success,
         feedback_message,
         updated_at: new Date().toISOString()
       })
       .eq('message_id', messageId)
     ```

## Next Steps

1. [ ] Create database table and policies
2. [ ] Add action logging to TicketTool
3. [ ] Update chat-messages POST endpoint
4. [ ] Update chat-messages PATCH endpoint
5. [ ] Test basic functionality

## Analytics Features to Build
- Success rate tracking
- Token usage monitoring
- Response time analysis
- Cost estimation (based on token usage)
- Failure analysis with user feedback 