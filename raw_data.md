# Role Verification Migration Plan

## Overview
This document outlines the files that need to be modified to switch from edge function role verification to using `raw_app_meta_data` directly from the user object.

## Files to Modify

### Core Authentication
1. `packages/shared/src/contexts/AuthContext.tsx`
   - Remove edge function call in `redirectBasedOnRole`
   - Use `user.raw_app_meta_data.role` instead
   - Update role checking logic

2. `packages/shared/src/components/portal/PortalPage.tsx`
   - Remove edge function verification in `verifyRole` useEffect
   - Use metadata from auth user object
   - Update role verification logic

### Callback Routes
3. `apps/client/src/app/client/auth/callback/route.ts`
   - Remove edge function call
   - Use session user metadata for role check
   - Update role verification logic

4. `apps/client/src/app/auth/callback/route.ts`
   - Similar changes as above for the main auth callback

### Portal Layouts
5. `apps/agent/src/app/agent-portal/layout.tsx`
   - Remove `supabase.functions.invoke('check-role')`
   - Use auth context user metadata
   - Update authorization check

### Utility Functions
6. `packages/shared/src/auth/utils.ts`
   - Remove or modify `checkUserRole` function
   - Add utility functions for checking roles from metadata
   - Update type definitions if needed

### Types
7. `packages/shared/src/auth/types.ts`
   - Update `AuthUser` type to include metadata fields
   - Add type definitions for metadata structure

## Clean Up
After the migration is complete, we can:
1. Delete the edge function `check-role`
2. Remove related environment variables
3. Update documentation

## Testing Plan
After modifying each file, we should test:
1. Initial authentication
2. Role-based redirects
3. Portal access controls
4. Session persistence
5. Role changes (if applicable)

## Notes
- The `raw_app_meta_data` field is already populated by Supabase during authentication
- This change will reduce latency by eliminating HTTP requests
- Role verification will still be secure as it's handled by Supabase's RLS policies 