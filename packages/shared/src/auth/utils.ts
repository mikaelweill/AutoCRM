import { UserRole, AuthError, AuthUser } from './types'

export class AuthenticationError extends Error implements AuthError {
  code?: string

  constructor({ message, code }: AuthError) {
    super(message)
    this.code = code
    this.name = 'AuthenticationError'
  }
}

export function isValidRole(role: string): role is UserRole {
  return role === 'client' || role === 'agent' || role === 'admin'
}

export function getUserRole(user: AuthUser | null): UserRole | null {
  if (!user) return null
  return user.app_metadata?.user_role || null // Access role from app_metadata
}

export function hasRole(user: AuthUser | null, role: UserRole): boolean {
  const userRole = getUserRole(user)
  return userRole === role
}

export function hasRequiredRole(user: AuthUser | null, requiredRole: UserRole): boolean {
  const userRole = getUserRole(user)
  if (!userRole) return false

  switch (userRole) {
    case 'admin':
      // Admin can only access admin portal
      return requiredRole === 'admin'
    case 'agent':
      // Agent can only access agent portal
      return requiredRole === 'agent'
    case 'client':
      // Client can only access client portal
      return requiredRole === 'client'
    default:
      return false
  }
} 