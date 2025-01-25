# Agent Production Realtime Investigation

## Current State
- ✅ Localhost: All portals (client, agent, admin) have realtime
- ✅ Production: Client portal has realtime
- ✅ Production: Admin portal has realtime
- ❌ Production: Agent portal lacks realtime

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

1. **JWT Token Role Issue**
   - Why: The `custom_access_token_hook` modifies JWT claims
   - Evidence: Role is set to 'authenticated' for Postgres but user_role in metadata
   - Test: Check if realtime policies correctly interpret the role from JWT

2. **WebSocket Connection**
   - Why: WebSocket might be using different auth context
   - Evidence: Only agent portal in prod is affected
   - Test: Monitor WebSocket connection attempts and JWT token used

3. **RLS Policy Interpretation**
   - Why: Policies might interpret agent role differently
   - Evidence: Works locally but not in prod
   - Test: Compare JWT tokens between local and prod

4. **Supabase Client Configuration**
   - Why: Client setup might differ in prod
   - Evidence: Other portals work fine
   - Test: Compare client initialization between portals

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