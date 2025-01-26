# Google OAuth Implementation Journey

## Overview
Implementing Google OAuth for Gmail API access using Supabase Edge Functions.

## Implementation Steps

### Step 1: Initial Auth Request
**What We Tried:**
1. Initial implementation with manual auth header check
2. Using Supabase's built-in auth with anon key
3. Removing auth checks completely after disabling JWT verification
4. Different curl commands with and without auth headers

**Current Status:** ❌ Still getting 401 Unauthorized
```bash
curl -i -X GET 'https://nkicqyftdkfphifgvejh.supabase.co/functions/v1/gmail-auth'
```

**Issues Encountered:**
- 401 errors persist even after disabling JWT verification in Supabase UI
- "Missing authorization header" error continues after code changes
- Changes to JWT verification settings don't seem to take effect

### Step 2: Google Callback Handling
**What We Tried:**
1. Initial implementation requiring auth for all paths
2. Modified code to skip auth for callback path
3. Disabled JWT verification in Supabase UI
4. Removed all manual auth checks

**Current Status:** ❌ Still getting 401 on callback
```
GET | 401 | https://nkicqyftdkfphifgvejh.supabase.co/functions/v1/gmail-auth/callback
```

## Latest Attempts (Progress Log)

### Attempt 1: HTML Auto-Redirect
**What We Tried:**
- Returned an HTML page with meta refresh and JavaScript redirect
- Added Content Security Policy headers
- Used both meta refresh and JavaScript for redundancy

**Outcome:** ❌ Failed
- Got Content Security Policy violations
- Script execution blocked due to sandbox restrictions
- Browser showed raw HTML instead of redirecting

### Attempt 2: HTTP 302 Redirect
**What We Tried:**
- Simplified to use pure HTTP 302 redirect
- Removed all client-side code (HTML, JavaScript)
- Used Location header for redirect
- Kept the callback handling the same

**Current Status:** 🟡 Progress
- Initial redirect works (browser follows 302 to Google)
- Still getting callback validation errors
- Error suggests OAuth library is being strict about redirect path validation

### Attempt 3: Direct Browser Flow
**What We Tried:**
- Accessed the endpoint directly in browser
- Successfully redirects to Google consent screen
- User can select account and approve permissions

**Outcome:** ❌ Infinite Loop
- Initial redirect to Google works
- Can select account and approve permissions
- Instead of completing flow, redirects back to account selection
- Creates infinite loop between:
  1. Account selection
  2. Permission approval
  3. Back to account selection

**Root Cause & Solution:**
The issue appears to be CORS-related. Need to:

1. Create `_shared/cors.ts` in Supabase functions:
```typescript
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
```

2. Update response headers in function:
```typescript
return new Response(data, {
  headers: { 
    ...corsHeaders, 
    'Content-Type': 'application/json'
  },
  status: 200,
});
```

This should:
- Allow proper cross-origin redirects
- Maintain OAuth state across redirects
- Complete the callback flow properly

## Updated Key Learnings
1. CORS headers are crucial for OAuth flows in Edge Functions
2. Need proper header handling in both initial request and callback
3. Shared CORS config helps maintain consistency
4. OAuth flow starts correctly but doesn't complete

## Next Immediate Steps
1. Add debug logging for PKCE code verifier and challenge
2. Verify state parameter is being properly handled
3. Check if OAuth2Client is maintaining state between redirects
4. Review Google OAuth documentation for required flow completion steps

## Next Steps to Consider
1. Double check Google Cloud Console redirect URI configuration
2. Verify exact path matching between OAuth config and callback handler
3. Consider implementing PKCE flow if not already in place
4. Add more detailed logging in callback handler
5. Review OAuth2Client library documentation for validation options

## Current Code Structure
```typescript
// Handle initial request - generate auth URL
const { uri } = await oauth2Client.code.getAuthorizationUri()

// Handle callback
if (url.pathname.endsWith('/gmail-auth/callback')) {
  // Process OAuth callback
}
```

## Environment Setup
- Google OAuth Client ID and Secret configured
- Supabase Edge Function deployed
- JWT verification disabled in UI (but might need redeployment)

## Open Questions
1. Why do JWT verification settings not take effect?
2. Is redeployment necessary after changing auth settings?
3. Are there platform-level settings overriding our configuration?

## Implementation Decision Point

After analysis, we identified two approaches for Gmail integration:

### 1. OAuth Approach (Current Implementation)
**Best for:** Multiple users connecting their own Gmail accounts (e.g., agents connecting work email)

**Key Code Structure:**
```typescript
// OAuth Implementation
const oauth2Client = new OAuth2Client({
  clientId: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  redirectUri: REDIRECT_URI,
  scopes: ['https://www.googleapis.com/auth/gmail.modify']
})

// Requires complex flow:
1. Get authorization URL
2. User consents
3. Handle callback
4. Exchange code for tokens
5. Store tokens
6. Implement refresh mechanism
```

### 2. Service Account Approach (Recommended for Company Email)
**Best for:** Single company email account management (e.g., support@company.com)

**Key Code Structure:**
```typescript
// Service Account Implementation
import { google } from 'googleapis';

const auth = new google.auth.GoogleAuth({
  keyFile: 'path/to/service-account.json',  // Downloaded from Google Console
  scopes: ['https://www.googleapis.com/auth/gmail.modify'],
});

const gmail = google.gmail({ version: 'v1', auth });

// Simple usage:
async function sendEmail() {
  await gmail.users.messages.send({
    userId: 'support@company.com',
    requestBody: {
      raw: base64EncodedEmail
    }
  });
}
```

## Decision & Next Steps
- Current OAuth implementation is 70% complete but complex
- Switching to Service Account approach will be simpler for current needs
- Can add OAuth later for agent email integration if needed

### Service Account Benefits
1. One-time setup
2. No token refresh needed
3. No user consent flow
4. More stable and reliable
5. Perfect for company email management

### Migration Plan
1. Create Service Account in Google Cloud Console
2. Download credentials
3. Update code to use Service Account
4. Remove OAuth implementation
5. Test with company email

## Code Comparison

### OAuth (Complex)
```typescript
// Need to handle:
- Token storage
- Token refresh
- User consent
- Callback URLs
- Error states
```

### Service Account (Simple)
```typescript
// One-time setup:
const auth = new google.auth.GoogleAuth({
  keyFile: 'credentials.json',
  scopes: ['https://www.googleapis.com/auth/gmail.modify'],
});

// Then just use:
const gmail = google.gmail({ version: 'v1', auth });
```

## Archived OAuth Implementation
Previous OAuth implementation attempts and learnings preserved above for reference if needed for future agent email integration. 