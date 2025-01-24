# Gmail Integration with SMTP/IMAP

## Current Progress ✅

### Database Schema
1. **Tickets Table Updates**
   - Added `source` column (default: 'web')
   - Existing tickets backfilled as 'web'
   - Uses existing fields for content and attachments

2. **New Ticket Emails Table**
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

## Email Processing Implementation

### Phase 1: Manual Polling (Current) ✅
1. **Manual Check Button**
   - Available to agents and admins
   - Instant email check when clicked
   - Perfect for testing and demos
   - Endpoint: `POST /functions/v1/gmail-imap/check`

2. **Processing Flow**
   - Agent clicks "Check New Emails"
   - System checks for unread emails
   - Creates/updates tickets as needed
   - Provides immediate feedback

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
1. [ ] Add "Check New Emails" button to UI
2. [ ] Implement email to ticket creation
3. [ ] Set up auto-responses
4. [ ] Add email threading support
5. [ ] Test various email scenarios

## Processing Flow
1. Manual trigger from UI
2. Check message_id:
   - New thread → Create ticket
   - Existing thread → Update ticket
3. Store email metadata in ticket_emails
4. Send auto-response if new ticket
5. Notify assigned agent

Would you like to proceed with:
1. Adding the check endpoint to IMAP function
2. Creating the UI button component
3. Implementing the ticket creation logic

## Vision: Email-Based Ticket System

### Ticket Creation Flow
1. Customer sends email to autocrm.sys@gmail.com
2. IMAP function detects new email
3. System creates ticket with:
   - Priority from hashtags or default
   - Customer info from email
   - Full email content in ticket body
4. Auto-response sent via SMTP confirming receipt

### Ticket Updates
1. Customer replies to ticket email
2. System matches reply to existing ticket via messageId
3. Updates ticket with new information
4. Notifies assigned agent

## Required Changes
1. Database Schema Updates
   - Add email_thread_id to tickets table
   - Add email_metadata for threading
   - Store customer email addresses

2. Email Processing Features
   - Auto-categorization based on content
   - Priority detection from email text
   - Customer information extraction
   - Thread matching for updates

## Technical Details

### Current SMTP Implementation
```typescript
// Edge Function: gmail-smtp
// Features:
- Send emails via SMTP
- HTML support
- Error handling
- Logging
```

### Required IMAP Implementation
```typescript
// Planned Features:
- Read incoming emails
- Parse email content
- Extract metadata
- Handle attachments
- Manage threads
```

### Email Template System
```typescript
// Planned Features:
- Ticket creation confirmation
- Update notifications
- Status change alerts
- Assignment notifications
``` 