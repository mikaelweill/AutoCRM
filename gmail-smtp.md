# Gmail Integration with SMTP/IMAP

## Current Progress ✅

### Database Schema
1. **Tickets Table Updates** ✅
   - Added `source` column (default: 'web')
   - Existing tickets backfilled as 'web'
   - Uses existing fields for content and attachments

2. **New Ticket Emails Table** ✅
   - Tracks email metadata for threading
   - Links emails to tickets
   - Fields:
     ```sql
     - message_id (for threading)
     - in_reply_to (for replies)
     - from_email/to_email
     - subject
     - direction (inbound/outbound)
     ```

### Implemented Features
1. **SMTP (Email Sending)** ✅
   - Edge Function: `gmail-smtp`
   - Uses `nodemailer`
   - Can send emails with subjects, body text
   - Support for priority tags (#high, #medium, #low)

2. **IMAP (Email Reading)** ✅
   - Edge Function: `gmail-imap`
   - Uses `imapflow`
   - Can read unread emails from inbox
   - Extracts metadata and content
   - Properly handles email threading via `inReplyTo`
   - Smart cleanup of reply content

3. **Email to Ticket Creation** ✅
   - Edge Function: `email-to-ticket`
   - Creates tickets from emails
   - Links to sender's account
   - Stores email metadata
   - Handles priority tags
   - Skips unknown senders
   - Converts replies to comments on existing tickets
   - Prevents duplicate ticket creation

4. **Comment to Email Replies** ✅
   - Edge Function: `comment-to-email`
   - Converts agent/admin comments to email replies
   - Maintains email threading via `In-Reply-To` headers
   - Updates ticket_emails table for tracking
   - Verifies commenter permissions
   - Preserves email subject threading (Re: prefix)

## Email Processing Implementation

### Phase 1: Manual Polling (Current) ✅
1. **Manual Check Button**
   - Available to agents and admins
   - Instant email check when clicked
   - Perfect for testing and demos
   - Three endpoints ready:
     - `POST /functions/v1/gmail-imap/check` - Fetches emails
     - `POST /functions/v1/email-to-ticket` - Creates tickets
     - `POST /functions/v1/comment-to-email` - Sends comment replies

2. **Processing Flow** ✅
   - Agent clicks "Check New Emails"
   - System checks for unread emails
   - Creates tickets for valid senders
   - Provides immediate feedback with:
     - Number of emails processed
     - Tickets created
     - Any errors encountered

3. **Benefits**
   - Full control over timing
   - Easier testing and debugging
   - Instant results when needed
   - No scheduling complexity

### Phase 2: Automation (Future)
Options to consider:
1. GitHub Actions (every X minutes)
2. Supabase Cron (hourly)
3. Self-scheduling function
4. Gmail webhooks

## Next Implementation Steps
1. [x] Add "Check New Emails" button to UI
2. [ ] Add attachment handling
3. [ ] Set up auto-responses
4. [x] Add email threading support
5. [ ] Test various email scenarios
6. [x] Implement agent/admin comments to email replies
7. [ ] Add HTML email support
8. [ ] Integrate comment-to-email in UI
9. [ ] Add rich text editor for email replies

## Processing Flow
1. Manual trigger from UI
2. Check message_id and inReplyTo:
   - New thread → Create ticket
   - Reply to existing thread → Create comment
3. Store email metadata in ticket_emails
4. Clean up email content (remove quotes for replies)
5. Send auto-response if new ticket
6. Notify assigned agent

### Comment to Email Flow
1. Agent/admin adds comment
2. System checks commenter permissions
3. Retrieves original email thread info
4. Sends reply maintaining thread headers
5. Records outbound email in ticket_emails
6. Updates ticket with reply status

## Technical Details

### Current Implementation
```typescript
// Edge Functions Available:
- email-to-ticket: Creates tickets from emails
- gmail-imap: Fetches new emails
- gmail-smtp: Sends emails
- comment-to-email: Converts comments to email replies

// Features:
- Creates tickets from emails
- Validates sender exists in system
- Stores email metadata
- Handles priority tags
- Converts replies to comments
- Smart content cleanup
- Returns detailed processing results
- Maintains email threading
- Supports agent/admin replies
```

### Planned Features
```typescript
// Next Steps:
- Rich text editor for replies
- Attachment handling
- Auto-responses
- HTML email support
- UI integration for comment-to-email
``` 