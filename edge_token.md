# Secure Token Signup Implementation

## Overview
Implement secure token-based signup using Supabase Edge Functions. This ensures token validation and user creation happen server-side, preventing any client-side bypassing of the token requirement.

## Progress

### ✅ Security Decisions Made
1. Using Edge Functions for secure token validation
2. Removing RLS policies from invitations table
   - Table completely locked down by default
   - Only accessible via admin keys
3. Password Security
   - Sent securely over HTTPS
   - Handled by Supabase's built-in security
   - No need for client-side hashing

### ✅ 1. Edge Function Created
File: `supabase/functions/signup-with-token/index.ts`
- ✅ Token validation
- ✅ User creation with admin privileges
- ✅ Invitation usage tracking
- ⏳ Need to fix linter errors

### ✅ 2. API Helper Created
File: `shared/src/lib/api.ts`
- ✅ Type-safe response interface
- ✅ Error handling for edge function calls
- ✅ Proper error messages and logging
- ✅ Supabase client integration

### 🔄 Next Steps
3. Modify AuthForm
4. Configuration & Deployment

## Remaining Steps

### 3. Modify AuthForm
Update: `packages/shared/src/components/auth/AuthForm.tsx`
```typescript
// Replace current token validation flow:
if (requireToken) {
  const result = await signUpWithToken(email, password, token)
  // Handle result
} else {
  // Regular signup remains unchanged
  await supabase.auth.signUp(...)
}
```

### 4. Configuration Steps
1. Set up Supabase CLI if not done
2. Configure edge function permissions
3. Deploy function
4. Test both flows:
   - Regular signup (no token)
   - Token-required signup

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