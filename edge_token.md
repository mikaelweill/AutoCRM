# Token-Based Signup Implementation

## Progress
- ✅ Created Edge Function for secure token-based signup
- ✅ Added role validation based on portal URLs (localhost and production)
- ✅ Implemented direct user creation in both `auth.users` and `public.users`
- ✅ Added detailed logging for debugging
- ✅ Removed database triggers in favor of Edge Function handling
- ✅ Added CORS validation with proper origin checking

## Current Issues
- 🔄 Need to fix client signup to use Edge Function instead of direct auth
- 🔄 Investigating invitation lookup issues (token/email matching)
- 🔄 Adding more detailed logging for invitation validation

## Next Steps
1. Modify client signup flow:
   - Update client portal to use the Edge Function instead of direct auth
   - Ensure consistent signup experience across all portals
   - Add proper error handling and user feedback

2. Improve invitation validation:
   - Add case-insensitive email matching
   - Better error messages for token/email mismatches
   - Add logging to track invitation usage

3. Security considerations:
   - Validate token expiration
   - Ensure atomic operations for invitation usage
   - Maintain strict portal-role validation

## Implementation Details
- Edge Function handles all user creation
- Role validation based on portal URL:
  - localhost:3000 -> client
  - localhost:3001 -> agent
  - localhost:3002 -> admin
  - auto-crm-{role}.vercel.app in production
- Direct creation in both auth and public tables
- No database triggers needed

## Testing Checklist
- [ ] Test client signup with Edge Function
- [ ] Verify role assignments
- [ ] Check invitation validation
- [ ] Test portal restrictions
- [ ] Verify error messages

## Security Considerations
- ✅ Token validation happens server-side
- ✅ User creation only proceeds after valid token
- ✅ Process is atomic (all operations succeed or all fail)
- ✅ Client cannot bypass token requirement
- ✅ Invitations table fully locked down
- ✅ Password handled securely by Supabase

## Testing Plan
1. Test valid token signup
2. Test invalid token signup
3. Test expired token
4. Test already used token
5. Test regular signup still works
6. Test error handling

## Implementation Order
1. ✅ Create edge function
2. ⏳ Fix edge function linter errors
3. ✅ Create API helper and test
4. 🔄 Modify AuthForm
5. Deploy and test in staging
6. Deploy to production 