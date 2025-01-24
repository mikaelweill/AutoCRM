# Gmail Integration with SMTP/IMAP

## Current Progress

### 1. Gmail Account Configuration ✅
- Set up Gmail account: `autocrm.sys@gmail.com`
- Generated App Password
- Added to Supabase environment variables

### 2. Email Sending (SMTP) ✅
- Created Edge Function `gmail-smtp`
- Implemented email sending using nodemailer
- Basic features working:
  - Send plain text emails
  - HTML support ready
  - Successfully tested

## Vision: Email-Based Ticket System

### 1. Ticket Creation via Email
- Clients send emails to `autocrm.sys@gmail.com`
- System automatically:
  - Creates new ticket
  - Extracts subject as ticket title
  - Uses email body as description
  - Parses hashtags for priority (#low, #medium, #high)
  - Records email source for threading

### 2. Ticket Updates via Email
- Any ticket activity triggers email notifications
- Email threading maintains conversation history
- Responses from either side update the ticket

### Required Changes

#### 1. Database Schema Updates
- Add to tickets table:
  ```sql
  - email_thread_id: For tracking email conversations
  - source: 'email' | 'web' | 'api'
  - email_metadata: JSON with email details
  ```

#### 2. Email Processing Features Needed
- [ ] IMAP integration for reading emails
- [ ] Email parsing logic:
  - Extract priority tags
  - Handle email threading
  - Process attachments
- [ ] Email template system for responses

#### 3. Integration Points
- [ ] Email → Ticket creation flow
- [ ] Ticket → Email notification flow
- [ ] Reply → Ticket update flow

## Next Steps

1. Add IMAP Functionality
   - Set up email reading
   - Implement webhook for new emails
   - Parse email content and metadata

2. Enhance SMTP Features
   - Add HTML templates
   - Support attachments
   - Handle CC/BCC

3. Create Email Processing System
   - Priority tag parsing
   - Email thread tracking
   - Template management

4. Update Database Schema
   - Add email-related fields
   - Create email templates table
   - Set up threading relationships

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