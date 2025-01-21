# Auth & Portal Separation Plan

## Current Issues
- Flash of unauthorized content when accessing protected routes
- Complex role protection in shared layout
- Mixed concerns between agent and client UIs
- Insufficient role isolation between portals

## Goal
Create separate portal applications (client, agent, and admin) with clean separation of concerns, strict role-based access, and no unauthorized content flashing. Each portal should be exclusively accessible by its intended role:
- Client portal: Only accessible to users with 'client' role
- Agent portal: Only accessible to users with 'agent' role
- Admin portal: Only accessible to users with 'admin' role

## Progress

### ✅ 1. Basic Structure Setup
- [x] Created monorepo structure with `apps/` and `packages/`
- [x] Set up shared package
- [x] Created package.json for each portal
- [x] Configured workspace dependencies

### ✅ 2. Shared Package Setup
- [x] Moved auth types and utilities
- [x] Moved configuration (env, roles, tickets)
- [x] Moved ticket service and types
- [x] Moved common utilities (cn)

### 🚧 3. Portal Setup (In Progress)
- [ ] Set up client portal base
- [ ] Set up agent portal base
- [ ] Set up admin portal base
- [ ] Configure portal-specific routing

## Next Steps

### 1. Portal-Specific Login Pages (2hr)
- [ ] Create login page for client portal
- [ ] Create login page for agent portal
- [ ] Create login page for admin portal
- [ ] Implement role-specific auth flows

### 2. Code Migration (3hr)
- [ ] Move existing routes:
  - Move `/app/client-portal/*` to `apps/client/src/app/*`
  - Move `/app/agent-portal/*` to `apps/agent/src/app/*`
  - Create new admin routes in `apps/admin/src/app/*`
- [ ] Move components:
  - Identify shared components → `packages/shared/src/components`
  - Move client components → `apps/client/src/components`
  - Move agent components → `apps/agent/src/components`
- [ ] Move layouts:
  - Split `/app/layout.tsx` into portal-specific layouts
  - Create portal-specific navigation components

### 3. Portal-Specific Features (2hr)
- [ ] Client: Ticket creation and viewing
- [ ] Agent: Ticket management and responses
- [ ] Admin: User management and system settings

### 4. Deployment Setup (2hr)
- [ ] Configure Vercel projects for each portal
- [ ] Set up environment variables
- [ ] Configure domain routing
- [ ] Test deployment pipeline

## Implementation Notes

### Portal URLs
- Development:
  - Client: `localhost:3000`
  - Agent: `localhost:3001`
  - Admin: `localhost:3002`

- Production:
  - Client: `client.yourdomain.com`
  - Agent: `agent.yourdomain.com`
  - Admin: `admin.yourdomain.com`

### Authentication Flow
1. Each portal has its own login page
2. Role checked immediately after login
3. Unauthorized users redirected to error page
4. No cross-portal access allowed

### Shared Code Structure
```
packages/shared/
├── src/
│   ├── auth/          # Auth types and utilities
│   ├── config/        # Shared configuration
│   ├── services/      # Shared services (tickets)
│   ├── types/         # Shared types
│   └── utils/         # Common utilities
```

## Success Criteria
- Each portal accessible only by appropriate role
- Clean separation of concerns
- Shared code properly abstracted
- Independent deployments working
- No unauthorized content flash 