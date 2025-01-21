import { UserRole } from '../auth/types'

const AGENT_PERMISSIONS = ['view_all_tickets', 'manage_tickets', 'assign_tickets'] as const
const ADMIN_PERMISSIONS = ['manage_users', 'manage_system', 'view_analytics', ...AGENT_PERMISSIONS] as const

export const ROLE_CONFIG: Record<UserRole, {
  label: string
  homePath: string
  permissions: readonly string[]
  description: string
}> = {
  client: {
    label: 'Client',
    homePath: '/dashboard',
    permissions: ['view_tickets', 'create_tickets', 'comment_tickets'],
    description: 'Regular client user with access to their own tickets'
  },
  agent: {
    label: 'Agent',
    homePath: '/dashboard',
    permissions: AGENT_PERMISSIONS,
    description: 'Support agent who can manage and respond to tickets'
  },
  admin: {
    label: 'Administrator',
    homePath: '/dashboard',
    permissions: ADMIN_PERMISSIONS,
    description: 'System administrator with full access to all features'
  }
}

export function getRoleConfig(role: UserRole) {
  return ROLE_CONFIG[role]
}

export function hasPermission(role: UserRole, permission: string): boolean {
  return ROLE_CONFIG[role].permissions.includes(permission)
} 