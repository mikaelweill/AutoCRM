# Latest Analysis (2024-01-22)

### RLS and WebSocket Connection Analysis

After investigating the Row Level Security (RLS) policies and their interaction with WebSocket connections, we can conclusively determine that RLS is not contributing to the connection issues. Here's the detailed analysis:

#### WebSocket Connection Sequence
1. Initial connection with anon key
2. WebSocket handshake (101 Switching Protocols)
3. Authentication upgrade with JWT
4. Channel subscription
5. RLS policies applied to data access

#### Current Issue
- The connection fails at step 2 (WebSocket handshake)
- We see:
  ```
  Status: Finished
  Size: 0 B
  ```
- Instead of the expected:
  ```
  Status: 101 Switching Protocols
  State: Pending
  ```

#### Evidence

1. Development Environment:
   - Connection succeeds (Status 101)
   - Authentication works
   - RLS policies work (data is received)
   - Same code, same RLS policies

2. Production Environment:
   - Connection fails immediately
   - Never reaches authentication step
   - Never reaches RLS evaluation
   - Same code, same RLS policies

#### Conclusion
- The issue occurs BEFORE authentication happens
- The issue occurs BEFORE RLS policies are evaluated
- RLS policies would only matter if we could establish the WebSocket connection
- This strongly suggests a network/infrastructure issue (Vercel, DNS, etc.) rather than a database permission issue

#### Next Steps
1. Investigate Vercel's WebSocket handling for the agent subdomain
2. Review DNS and routing configuration
3. Compare infrastructure setup between working portals and agent portal

You make a really important point. Let's think about what makes AGENT/PROD uniquely different from the other 5 combinations:

Looking at the code, there are a few places where AGENT is treated differently:

1. **Role Validation in signup-with-token**:
   - Strict portal-specific role checking
   - Must match invitation role with portal type
   - Enforced in production URLs

2. **Auth Callback**:
   ```typescript
   // Check if user has the required role
   const userRole = session?.user?.app_metadata?.user_role
   if (!userRole || userRole !== 'agent') {
     return NextResponse.redirect(new URL('/unauthorized', requestUrl.origin))
   }
   ```

3. **CORS Headers**:
   - Strict origin validation
   - Different handling for different subdomains

The fact that it's ONLY agent in production suggests:
- It's not a timing issue (would affect dev too)
- It's not a role permission issue (would affect dev too)
- It's not a general CORS issue (would affect other prod sites)

It must be something that is:
- Specific to the agent subdomain
- Only happens in production
- Related to WebSocket connection (since regular API calls work)

Could it be:
- A specific Supabase configuration for the agent subdomain?
- A WebSocket-specific CORS rule that's different for the agent subdomain?
- A DNS/routing issue specific to the agent subdomain's WebSocket traffic?

The key insight is that it must be something that ONLY affects WebSocket connections from the agent subdomain in production. That's a very specific condition that should help narrow down where to look.

---

# Agent Production Realtime Investigation

## Executive Summary

### Problem
Agent portal's real-time functionality works in localhost but fails in production, while admin and client portals work in both environments.

### Key Findings
1. **Authentication Works**: JWT claims and user session are correct
2. **WebSocket Issue**: Connection attempts use anon role despite authenticated session
3. **Retry Problems**: Our retry logic caused multiple subscription attempts, making the issue worse

### Current Status
- ✅ Auth State: Working (correct JWT claims, session)
- ✅ User Context: Present (correct user ID)
- ❌ WebSocket: Failing (connects with anon role)
- ❌ Real-time: Not working in production

### Next Action Items
1. Remove problematic retry logic ✅
2. Investigate WebSocket auth token usage 🚧
3. Compare with working portal implementations 🚧

---

## Detailed Investigation

## Current State
- ✅ Localhost: All portals (client, agent, admin) have realtime
- ✅ Production: Client portal has realtime
- ✅ Production: Admin portal has realtime
- ❌ Production: Agent portal lacks realtime

## Investigation Timeline

### Initial Setup
1. Compared subscription setup across portals:
   - Admin: Simple setup, no explicit error handling
   - Client: Basic setup with status logging
   - Agent: Enhanced setup with auth check and error handling

### Attempt 1: Enhanced Error Handling
- Added waiting for authenticated user
- Added explicit error handling for CHANNEL_ERROR
- Added retry logic for failed connections
- **Result**: Still failing in production

### Attempt 2: Auth State Analysis
Observed behavior in production:
```javascript
// Initial state correct
JWT Claims: {
  aud: 'authenticated',
  exp: 1737775145,
  // ... correct claims
}

// But WebSocket connects with anon role
WebSocket URL: '.../websocket?apikey=...role=anon...'
```

### Attempt 3: Simplified Subscription (Latest)
- Removed user dependency and auth check
- Moved Supabase client creation to component level
- Simplified subscription by removing status handling
- Removed extra logging
- Changed to match client/admin pattern exactly
- **Result**: Still failing in production with same symptoms
  - WebSocket still connects with anon role
  - Suggests issue is not related to subscription setup or timing
  - Points to a more fundamental difference in how the agent portal handles WebSocket connections in production

### Current Issues Identified
1. **Authentication Timing**: ❌ (Ruled out)
   - Removing auth dependency didn't help
   - Simple subscription still fails
   - Same behavior as complex subscription

2. **Connection Issues**: 🔍 (Primary Focus)
   - WebSocket consistently uses anon role in production
   - Behavior persists across different subscription patterns
   - Issue appears environment-specific (prod vs local)

3. **Retry Loop Problems**: ✅ (Resolved)
   - Removed retry logic
   - Simplified subscription setup
   - No more multiple subscription attempts

## Key Differences from Working Portals

### 1. Admin Portal
- Doesn't wait for auth state
- Uses simpler subscription setup
- Works in production despite less robust implementation

### 2. Client Portal
- Similar to admin setup
- No explicit error handling
- Works in production with basic implementation

### 3. Agent Portal (Current)
- Waits for auth state ✅
- Has error handling ✅
- Includes retry logic ❌ (causing issues)
- Uses authenticated user check ✅
- Still connects with anon role ❌

## Root Cause Analysis
1. **Primary Issue**:
   - WebSocket connection uses anon apikey despite authenticated session
   - Retry logic compounds the problem by creating multiple failed attempts

2. **Contributing Factors**:
   - Auth state might not be fully propagated when WebSocket connects
   - Retry mechanism may be interfering with natural reconnection
   - Multiple subscription attempts causing channel conflicts

## Next Steps

### Immediate Actions
1. Remove retry logic to prevent multiple subscription attempts
2. Investigate why WebSocket uses anon apikey despite authenticated session
3. Compare Supabase client initialization between portals

### Questions to Answer
1. Why does the WebSocket use anon apikey when JWT claims are correct?
2. Why do admin and client portals work with simpler implementation?
3. Is there a timing issue between auth state and WebSocket connection?

### Potential Solutions to Try
1. Delay WebSocket connection until after auth confirmation
2. Simplify to match working portal implementations
3. Investigate Supabase client configuration differences

## Key Findings

### 1. Authentication Flow
- Agent authentication uses `custom_access_token_hook` in PostgreSQL
- Role is stored in both `app_metadata.user_role` and root level `user_role`
- JWT claims are modified to keep role as 'authenticated' for Postgres
- Agent signup requires token validation and correct portal URL

### 2. Realtime Configuration
- Realtime is enabled via `supabase_realtime` publication
- Tables with realtime enabled:
  - `public.tickets`
  - `public.attachments`
  - `public.ticket_activities`
- Replica identity is set to FULL for tickets table

### 3. CORS & Origins
- Strict origin validation in place
- Allowed origins include:
  ```
  http://localhost:3000
  http://localhost:3001
  http://localhost:3002
  https://auto-crm-client.vercel.app
  https://auto-crm-agent.vercel.app
  https://auto-crm-admin.vercel.app
  ```

## Environment Differences
1. **URLs**:
   - Localhost: `localhost:3000` (client), `localhost:3001` (agent), `localhost:3002` (admin)
   - Production: `auto-crm-client.vercel.app`, `auto-crm-agent.vercel.app`, `auto-crm-admin.vercel.app`

## Potential Areas to Investigate

### 1. Supabase Configuration
- **Realtime Settings**: Check if realtime is enabled for all tables
- **Database Webhooks**: Verify if any webhooks might be interfering
- **Connection Limits**: Check if we're hitting connection limits in production

### 2. Authentication & Policies
- **RLS Policies**: Verify realtime policies for agent role
- **Token Expiration**: Check if agent tokens are expiring differently
- **Role Validation**: Ensure agent role is properly set in auth.users

### 3. Network & CORS
- **CORS Settings**: Verify CORS configuration for agent production URL
- **WebSocket Connection**: Check if WebSocket connections are being blocked
- **SSL/TLS**: Verify SSL certificate issues aren't blocking WebSocket

### 4. Code Differences
- **Subscription Setup**: Compare subscription code across portals
- **Error Handling**: Look for agent-specific error handling
- **Environment Variables**: Check for environment-specific configurations

## Most Likely Hypotheses (Ranked)

1. **Channel Configuration Issue**
   - Why: Different channel naming and setup patterns between portals
   - Evidence: Admin uses 'tickets-changes', while agent/client use 'public:tickets'
   - Test: Align channel naming and configuration across portals

2. **WebSocket Connection Timing**
   - Why: Agent portal has more complex subscription setup with status handling
   - Evidence: Admin portal subscribes immediately without status checks
   - Test: Simplify subscription timing and error handling

3. **JWT Token Role Issue**
   - Why: The `custom_access_token_hook` modifies JWT claims
   - Evidence: Role is set to 'authenticated' for Postgres but user_role in metadata
   - Test: Check if realtime policies correctly interpret the role from JWT

4. **Environment-Specific Behavior**
   - Why: Works in local but fails in production despite same code
   - Evidence: Only agent portal affected in production
   - Test: Compare environment variables and configuration between environments

## Potential Solutions (Ranked)

1. **Standardize Channel Configuration**
   - Align channel naming with working admin portal
   - Remove status handling
   - Use consistent subscription patterns

2. **Simplify Subscription Setup**
   - Remove explicit error handling
   - Subscribe immediately like admin portal
   - Minimize subscription configuration

3. **Environment Configuration**
   - Verify environment variables
   - Check Supabase project settings
   - Ensure consistent configuration

4. **Hybrid Approach**
   - Test different channel configurations
   - Implement fallback mechanisms
   - Monitor subscription success rates

## Implementation Plan

### Option 1: Channel Standardization
1. Update channel name to match admin portal
2. Remove status handling
3. Simplify subscription code
4. Test in development and production

### Option 2: Subscription Simplification
1. Remove error handling
2. Remove status checks
3. Subscribe immediately
4. Test behavior

### Option 3: Environment Alignment
1. Audit environment variables
2. Check Supabase settings
3. Verify configuration
4. Test in both environments

## Action Plan

1. **Verify JWT Token**
   - Check JWT token content in prod agent portal
   - Compare with working local agent portal
   - Look for differences in role claims

2. **Monitor WebSocket**
   - Add logging for WebSocket connection attempts
   - Check if connection uses correct JWT
   - Verify WebSocket URL and headers

3. **Review RLS Policies**
   - Check if policies handle 'authenticated' role correctly
   - Verify agent-specific policies
   - Test policy execution with both role formats

4. **Client Configuration**
   - Compare Supabase client setup across portals
   - Check for environment-specific configurations
   - Verify auth persistence settings

## Questions to Answer
1. What's in the JWT token when connecting to realtime?
2. Does the WebSocket connection include the correct auth headers?
3. Are RLS policies correctly interpreting the agent role?
4. Is the token refresh working correctly in prod?

## Next Steps
1. Add debug logging to WebSocket connection
2. Compare JWT tokens between environments
3. Test policy execution with different role formats
4. Review client initialization differences

## Questions to Answer
1. Are WebSocket connections being initiated?
2. Are connections being rejected?
3. Are there any error messages in the console?
4. What's different about agent authentication?

## Subscription Pattern Comparison

### Agent Portal (`apps/agent/src/app/agent-portal/page.tsx`)
```typescript
const channel = supabase
  .channel('public:tickets')
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'tickets'
    },
    () => fetchStats()
  )
  .subscribe((status) => {
    console.log('Subscription status:', status)
    if (status === 'SUBSCRIBED') {
      console.log('Successfully subscribed to tickets changes')
    } else if (status === 'CHANNEL_ERROR') {
      console.error('Channel error for user:', user.id)
    }
  })
```

### Admin Portal (`apps/admin/src/app/admin-portal/page.tsx`)
```typescript
const ticketsChannel = supabase
  .channel('tickets-changes')
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'tickets'
    },
    () => fetchDashboardData()
  )
  .subscribe()
```

### Client Portal (`apps/client/src/app/client-portal/page.tsx`)
```typescript
const channel = supabase
  .channel('public:tickets')
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'tickets'
    },
    () => fetchStats()
  )
  .subscribe((status) => {
    console.log('Subscription status:', status)
    if (status === 'SUBSCRIBED') {
      console.log('Successfully subscribed to tickets changes')
    }
  })
```

### Key Differences
1. **Channel Names**:
   - Agent & Client: Use `'public:tickets'` (schema-based naming)
   - Admin: Uses `'tickets-changes'` (custom naming)

2. **Subscription Handling**:
   - Agent: Has explicit error handling for `CHANNEL_ERROR`
   - Client: Only logs successful subscription
   - Admin: No status handling

3. **Auth Dependencies**:
   - Agent: Waits for `user` from `useAuth()`
   - Client & Admin: Start subscription immediately

4. **Error Handling**:
   - Agent: Most robust with error states
   - Client: Basic success logging
   - Admin: No explicit error handling 

# Agent Portal Real-time Investigation

## Latest Update (2024-01-22)

### Recent Investigation Findings
1. **WebSocket Connection Analysis**:
   - WebSocket consistently connects with anon role despite authenticated session
   - Connection URL shows `role=anon` in the apikey parameter
   - Multiple connection attempts result in repeated `CHANNEL_ERROR` status
   - Auth state shows correct JWT claims and successful sign-in

2. **Attempted Solutions**:
   - Matched admin portal's subscription pattern exactly:
     - Used `tickets-changes` channel name
     - Removed status handling
     - Simplified subscription code
   - Result: Still fails with same symptoms
     - WebSocket still connects with anon role
     - Suggests issue is not related to subscription setup

3. **Key Insights**:
   - Problem occurs before channel subscription
   - WebSocket connection uses anon key before auth upgrade attempt
   - Issue specific to agent subdomain in production
   - Other portals (client/admin) work with same Supabase client setup

4. **Current Understanding**:
   - Issue likely related to Site URL configuration in Supabase
   - Site URL only allows one domain
   - Works for client/admin but fails for agent subdomain
   - WebSocket connections may have stricter domain requirements

### Next Steps to Investigate
1. **Potential Solutions**:
   - Set up proxy for WebSocket connections
   - Use different Supabase projects per environment
   - Move WebSocket connections to shared domain 