# AI Agent Feedback System

## Overview
Implementation plan for collecting user feedback on AI agent actions. The system will prompt for feedback after tool usage and store results in the database.

## Database Structure
We already have the necessary field in the `chat_messages` table:
```sql
CREATE TABLE IF NOT EXISTS "public"."chat_messages" (
    -- existing fields...
    "success" boolean,  -- Stores the feedback result
    -- other fields...
);
```

## Implementation Steps

### 1. Track Tool Usage
- Add a `toolsUsed` flag to message state in ChatWindow
- Set this flag when any tool is used in the agent's response
- Only show feedback UI for messages with `toolsUsed = true`

### 2. UI Components

#### Feedback Request Component
```tsx
interface FeedbackRequestProps {
  messageId: string;
  onFeedback: (success: boolean) => void;
}

// Component to be added after tool-using messages
const FeedbackRequest: React.FC<FeedbackRequestProps> = ({ messageId, onFeedback }) => {
  return (
    <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
      <span>Was this action successful?</span>
      <button onClick={() => onFeedback(true)} className="...">✅ Yes</button>
      <button onClick={() => onFeedback(false)} className="...">❌ No</button>
    </div>
  );
};
```

### 3. Database Updates
- Create an API endpoint to update feedback:
  ```typescript
  // POST /api/chat-messages/{messageId}/feedback
  async function updateFeedback(messageId: string, success: boolean) {
    await supabase
      .from('chat_messages')
      .update({ success })
      .eq('id', messageId);
  }
  ```

### 4. Message Component Updates
- Modify the existing message component to:
  1. Check if message used tools
  2. Show feedback UI if tools were used and feedback not yet given
  3. Show feedback result indicator if feedback was given

### 5. State Management
- Add states to track:
  - Which messages used tools
  - Which messages have received feedback
  - Loading states during feedback submission

## Implementation Order

1. First Phase:
   - Add tool usage tracking
   - Create basic feedback UI component
   - Implement feedback submission logic

2. Second Phase:
   - Add feedback result indicators
   - Implement loading states
   - Add error handling

3. Polish:
   - Add animations for feedback transitions
   - Implement success/error toasts
   - Add analytics tracking

## Notes
- Feedback is optional - users don't have to provide it
- Only show feedback UI for messages where tools were actually used
- Keep the UI clean and non-intrusive
- Consider adding analytics to track feedback patterns 