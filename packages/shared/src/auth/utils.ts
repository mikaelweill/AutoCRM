import { UserRole, AuthError } from './types'

export class AuthenticationError extends Error implements AuthError {
  code?: string

  constructor({ message, code }: AuthError) {
    super(message)
    this.code = code
    this.name = 'AuthenticationError'
  }
}

export async function checkUserRole(accessToken: string): Promise<UserRole> {
  try {
    const response = await fetch('https://nkicqyftdkfphifgvejh.supabase.co/functions/v1/check-role', {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(errorText)
    }
    
    const { role } = await response.json()
    
    if (!isValidRole(role)) {
      throw new Error('Invalid role')
    }

    return role
  } catch (error) {
    throw new AuthenticationError({
      message: 'Failed to check user role',
      code: 'ROLE_CHECK_FAILED'
    })
  }
}

export function isValidRole(role: string): role is UserRole {
  return role === 'client' || role === 'agent' || role === 'admin'
} 