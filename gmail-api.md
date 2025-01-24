# Gmail API Integration with Edge Functions

## Current Progress

### 1. Google Cloud Setup ✅
- Created project in Google Cloud Console
- Enabled Gmail API
- Created Service Account: `autocrm-gmail-service`
- Created OAuth 2.0 Client ID (Web application)
- Configured OAuth consent screen
- Added test user: `autocrm.sys@gmail.com`

### 2. Credentials Setup ✅
- Service Account JSON key downloaded
- OAuth Client credentials configured with:
  - Origin: `https://nkicqyftdkfphifgvejh.supabase.co`
  - Redirect URI: `https://nkicqyftdkfphifgvejh.supabase.co/functions/v1/gmail-api/callback`

### 3. Environment Variables Setup ✅
- Added `GMAIL_SERVICE_ACCOUNT`: Service account JSON for Gmail API access
- Using existing OAuth credentials:
  - `GOOGLE_CLIENT_ID`: For OAuth authentication
  - `GOOGLE_CLIENT_SECRET`: For OAuth authentication

## Attempted Approaches

### 1. Service Account with Gmail API ❌
- Created and configured service account
- Added service account JSON to environment variables
- Failed with "unauthorized_client" error
- Issue: Service accounts have limited access to regular Gmail accounts

### 2. OAuth Flow ❌
- Implemented OAuth2 authentication flow
- Similar to previous attempts in `@google-oauth.md`
- Led to infinite authentication loops
- Not suitable for backend service use case

## New Direction: SMTP Approach

Instead of using Gmail API, we'll use Gmail's SMTP server which is:
- Simpler to set up
- Works with regular Gmail accounts
- Requires only App Password (2FA must be enabled)
- No complex OAuth or service account setup needed

### Next Steps

1. Enable 2-Factor Authentication on `autocrm.sys@gmail.com`
2. Generate App Password for AutoCRM
3. Create new Edge Function using SMTP
4. Implement email sending functionality
5. Add email reading capabilities
6. Connect with ticket system

## Technical Details

### Required Setup
- Gmail 2FA enabled
- App Password generated
- SMTP credentials configured

### Security Considerations
- Store SMTP credentials securely in environment variables
- Implement rate limiting
- Add error handling and logging

## Implementation Plan

1. Set up Gmail 2FA and App Password ⬅️ NEXT STEP
2. Create new Edge Function for SMTP
3. Implement basic email operations
4. Add webhook handling for incoming emails
5. Connect with ticket system
6. Add monitoring and error handling

Would you like to proceed with the SMTP approach? 