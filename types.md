# Type System Analysis

## Current Type Files

### 1. `auth/types.ts`
- **Dependencies**: 7+ (Highest)
- **Used By**: 
  - Auth callbacks
  - Core context providers
  - Portal components
  - Config files
  - Type definitions
  - Shared index exports
- **Unique Types**:
  - `AuthUser` (extends Supabase User)
  - `AppMetadata`
  - `AuthError`
  - `UserRole` (duplicated elsewhere)

### 2. `types/database.ts`
- **Dependencies**: 6+
- **Used By**:
  - Knowledge base components
  - Ticket services
  - Admin portal components
  - Client portal pages
  - Article components
- **Notable**: This is a superset of `lib/database.types.ts`
- **Additional Content**: 
  - Includes `knowledge_base_articles` table
  - Complete database schema types

### 3. `types/tickets.ts`
- **Dependencies**: 1+ (plus indirect through shared export)
- **Used By**:
  - Shared index exports
  - Ticket-related components (indirectly)
- **Contains**:
  - Enhanced versions of database types
  - Additional relations (`client`, `agent`)
  - Frontend-specific types (`CreateTicketData`)

### 4. `lib/database.types.ts`
- **Dependencies**: 1 (Lowest)
- **Used By**:
  - Base service class
- **Note**: Subset of `types/database.ts`

## Type Relationships

### Superset Relationships
```
types/database.ts
    ↓ (superset)
lib/database.types.ts
```

### Duplicate Definitions
1. `UserRole` appears in:
   - `auth/types.ts`
   - `lib/database.types.ts`
   - `types/database.ts`

2. Database table types duplicated between:
   - `lib/database.types.ts`
   - `types/database.ts`

3. Ticket-related types have overlapping definitions:
   - Database schema in `database.types.ts`
   - Enhanced versions in `tickets.ts`

## Potential Refactoring Opportunities

### 1. Single Source of Truth
- Use `types/database.ts` as the primary database type definition
- Deprecate `lib/database.types.ts`
- Move `UserRole` to `auth/types.ts` exclusively

### 2. Type Hierarchy
Establish clear hierarchy:
```
auth/types.ts (core types)
    ↓
types/database.ts (database schema)
    ↓
types/tickets.ts (enhanced types)
```

### 3. Type Enhancement Pattern
- Keep database types pure in `database.ts`
- Use type enhancement/composition in feature-specific files
- Example:
  ```typescript
  // Instead of redefining, enhance:
  type TicketWithRelations = Database['public']['Tables']['tickets']['Row'] & {
    client: User
    agent: User | null
    attachments?: Attachment[]
  }
  ```

## Migration Strategy (Future)

1. **Phase 1**: Consolidate Sources
   - Move all database types to `types/database.ts`
   - Update imports in `base.ts`
   - Keep `auth/types.ts` for auth-specific types

2. **Phase 2**: Enhance Type Safety
   - Use type composition instead of redefinition
   - Create clear separation between DB and frontend types
   - Implement proper type enhancement patterns

3. **Phase 3**: Clean Up
   - Remove `lib/database.types.ts`
   - Update all imports to use new type sources
   - Add type documentation

## Impact Analysis

### High-Impact Changes
- Moving `UserRole` definition
- Removing `lib/database.types.ts`
- Changing ticket type definitions

### Low-Impact Changes
- Adding type documentation
- Implementing type composition
- Adding new utility types

## Notes for Future Development
1. Consider using branded types for IDs
2. Add runtime type validation
3. Consider generating types from database schema
4. Add proper JSDoc documentation to types
5. Consider using strict null checks 