# Role Verification Migration Plan

## Overview
This document outlines the files that need to be modified to switch from edge function role verification to using `app_metadata.user_role` directly from the JWT claims.

## Files to Modify

### ✅ Types (DONE)
1. `packages/shared/src/auth/types.ts`
   - Updated `AuthUser` type to include metadata fields
   - Added `AppMetadata` type definition
   - Added root level `user_role` field

### ✅ Utility Functions (DONE)
2. `packages/shared/src/auth/utils.ts`
   - Removed `checkUserRole` function
   - Added utility functions for checking roles from metadata
   - Added `hasRequiredRole` with role hierarchy
   - Removed hardcoded edge function URLs

### ✅ Core Authentication (DONE)
3. `packages/shared/src/contexts/AuthContext.tsx`
   - Removed edge function call in `redirectBasedOnRole`
   - Using `user.app_metadata.user_role` instead
   - Updated role checking logic using new utils
   - Removed hardcoded edge function URLs

### Remaining Files to Update

4. `packages/shared/src/components/portal/PortalPage.tsx`
   - Remove edge function verification in `verifyRole` useEffect
   - Use metadata from auth user object (`user.app_metadata.user_role`)
   - Update role verification logic using new utils
   - Remove hardcoded edge function URLs

5. `apps/client/src/app/client/auth/callback/route.ts`
   - Remove edge function call
   - Use `session.user.app_metadata.user_role` for role check
   - Update role verification logic
   - Remove hardcoded edge function URLs

6. `apps/client/src/app/auth/callback/route.ts`
   - Similar changes as above for the main auth callback
   - Remove edge function calls
   - Use metadata directly from session

7. `apps/agent/src/app/agent-portal/layout.tsx`
   - Remove `supabase.functions.invoke('check-role')`
   - Use auth context user metadata
   - Update authorization check using new utils

8. `apps/admin/src/app/admin-portal/layout.tsx`
   - Similar changes as agent portal layout
   - Update role verification to use metadata
   - Remove any edge function calls

## Clean Up (After All Changes)
1. Delete the edge function `check-role` completely
2. Remove related environment variables:
   - Remove edge function URLs from .env files
   - Remove any related API keys or configs
3. Update documentation
4. Remove any edge function deployment configs

## Testing Plan
After modifying each file, we should test:
1. Initial authentication
2. Role-based redirects
3. Portal access controls
4. Session persistence
5. Role changes (if applicable)
6. Role-based component rendering
7. Verify JWT claims structure matches our types
8. Test role synchronization between auth and public users table

## Notes
- The role is available in two places in the JWT:
  - `app_metadata.user_role`
  - Root level `user_role`
- This change will reduce latency by eliminating HTTP requests
- Role verification will still be secure as it's handled by Supabase's RLS policies
- No edge functions are needed for role verification anymore
- All role checks will be done client-side using the JWT claims 