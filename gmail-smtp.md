# Gmail Integration with SMTP/IMAP

## Current Progress ✅

### Setup
- Gmail account configured (autocrm.sys@gmail.com)
- 2FA enabled and App Password generated
- Environment variables set in Supabase (`GMAIL_APP_PASSWORD`)

### Implemented Features
1. **SMTP (Email Sending)** ✅
   - Edge Function: `gmail-smtp`
   - Uses `nodemailer` library
   - Can send emails with subjects, body text
   - Support for priority tags (#high, #medium, #low)

2. **IMAP (Email Reading)** ✅
   - Edge Function: `gmail-imap`
   - Uses `imapflow` library
   - Can read unread emails from inbox
   - Extracts all relevant metadata (subject, from, date, messageId)
   - Parses priority tags from email content

### Key Learnings
- App Password approach is simpler than OAuth
- Both SMTP and IMAP work well with Edge Functions
- Can handle email threading via messageId and inReplyTo fields
- Priority tags can be extracted from email content

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

## Next Steps
1. [ ] Create ticket creation endpoint that uses both IMAP/SMTP
2. [ ] Update database schema for email integration
3. [ ] Implement auto-response templates
4. [ ] Add email thread tracking
5. [ ] Set up periodic email checking
6. [ ] Add email validation and spam filtering

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

Would you like to start with:
1. Adding IMAP functionality for reading emails?
2. Updating the database schema?
3. Something else? 