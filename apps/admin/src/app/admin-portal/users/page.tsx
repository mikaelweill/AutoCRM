'use client'

import { useState, useEffect } from 'react'
import { createClient } from 'shared/src/lib/supabase'
import { Shield, UserCog, Eye, EyeOff, Copy, Trash2 } from 'lucide-react'

interface Invitation {
  id: string
  email: string
  role: 'admin' | 'agent'
  token: string
  expires_at: string
  created_at: string
  used_at: string | null
}

export default function UsersPage() {
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'admin' | 'agent'>('agent')
  const [isCreating, setIsCreating] = useState(false)
  const [showToken, setShowToken] = useState<string | null>(null)
  const [revealedTokens, setRevealedTokens] = useState<Set<string>>(new Set())
  
  const supabase = createClient()

  useEffect(() => {
    fetchInvitations()

    // Set up real-time subscription
    const channel = supabase
      .channel('invitations-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'invitations'
        },
        () => {
          console.log('Invitations updated, refreshing...')
          fetchInvitations()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  async function fetchInvitations() {
    try {
      const { data, error: fetchError } = await supabase
        .from('invitations')
        .select('*')
        .order('created_at', { ascending: false })

      if (fetchError) throw fetchError

      // Validate and transform the data
      const validatedData = data?.map(item => ({
        id: item.id as string,
        email: item.email as string,
        role: item.role as 'admin' | 'agent',
        token: item.token as string,
        expires_at: item.expires_at as string,
        created_at: item.created_at as string,
        used_at: item.used_at as string | null
      })) || []

      setInvitations(validatedData)
      setError(null)
      // Clear revealed tokens when invitations are refreshed
      setRevealedTokens(new Set())
    } catch (err) {
      console.error('Error fetching invitations:', err)
      setError('Failed to load invitations')
    } finally {
      setLoading(false)
    }
  }

  async function createInvitation(e: React.FormEvent) {
    e.preventDefault()
    setIsCreating(true)
    try {
      // Insert the invitation
      const { data, error: insertError } = await supabase
        .from('invitations')
        .insert({
          email,
          role,
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours from now
        })
        .select('*')
        .single()

      if (insertError) {
        console.error('Insert error:', insertError)
        throw new Error(insertError.message)
      }

      if (!data?.token) {
        throw new Error('No token received from server')
      }

      // Show the token
      setShowToken(data.token)
      
      // Reset form
      setEmail('')
      setRole('agent')
      setError(null)
    } catch (err) {
      console.error('Error creating invitation:', err)
      setError(err instanceof Error ? err.message : 'Failed to create invitation')
    } finally {
      setIsCreating(false)
    }
  }

  // Close modal and reset token
  const handleCloseModal = () => {
    setShowToken(null)
  }

  // Handle copy token
  const handleCopyToken = (token: string) => {
    navigator.clipboard.writeText(token)
  }

  // Add delete invitation function
  const handleDeleteInvitation = async (id: string, isUsed: boolean) => {
    if (isUsed) {
      setError('Cannot delete used invitations')
      return
    }

    try {
      console.log('Attempting to delete invitation:', id)
      const { error: deleteError } = await supabase
        .from('invitations')
        .delete()
        .match({ id })

      if (deleteError) {
        console.error('Delete error:', deleteError)
        throw new Error(deleteError.message)
      }
      
      console.log('Invitation deleted successfully')
      // Show success message
      setError('Invitation deleted successfully')
      setTimeout(() => setError(null), 3000) // Clear message after 3 seconds
      
    } catch (err) {
      console.error('Error deleting invitation:', err)
      setError(err instanceof Error ? err.message : 'Failed to delete invitation')
    }
  }

  // Handle token visibility
  const handleTokenVisibility = (id: string, isCurrentlyRevealed: boolean) => {
    const newRevealedTokens = new Set(revealedTokens)
    if (isCurrentlyRevealed) {
      newRevealedTokens.delete(id)
    } else {
      newRevealedTokens.add(id)
    }
    setRevealedTokens(newRevealedTokens)
  }

  if (loading) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-semibold mb-6">User Management</h1>
        <div className="animate-pulse space-y-4">
          <div className="h-32 bg-gray-100 rounded"></div>
          <div className="h-64 bg-gray-100 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold mb-6">User Management</h1>

      {/* Create Invitation Form */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
        <h2 className="text-lg font-medium mb-6">Create New Invitation</h2>
        <form onSubmit={createInvitation} className="space-y-6">
          {/* Email Input */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <div className="relative rounded-md shadow-sm">
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="block w-full rounded-md border-gray-300 pr-10 py-3 text-base focus:border-blue-500 focus:ring-blue-500"
                placeholder="Enter email address..."
                required
              />
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                <span className="text-gray-400">@</span>
              </div>
            </div>
            <p className="mt-1 text-xs text-gray-500">You'll need to share the invitation token with this user manually</p>
          </div>
          
          {/* Role Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Role
            </label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setRole('agent')}
                className={`relative rounded-lg border p-4 flex flex-col items-center text-sm font-medium ${
                  role === 'agent'
                    ? 'border-blue-500 ring-2 ring-blue-500 text-blue-700 bg-blue-50'
                    : 'border-gray-300 text-gray-900 hover:border-gray-400'
                }`}
              >
                <UserCog className="h-6 w-6 mb-2" />
                <span>Agent</span>
                <span className="text-xs text-gray-500 mt-1">Support staff member</span>
              </button>

              <button
                type="button"
                onClick={() => setRole('admin')}
                className={`relative rounded-lg border p-4 flex flex-col items-center text-sm font-medium ${
                  role === 'admin'
                    ? 'border-purple-500 ring-2 ring-purple-500 text-purple-700 bg-purple-50'
                    : 'border-gray-300 text-gray-900 hover:border-gray-400'
                }`}
              >
                <Shield className="h-6 w-6 mb-2" />
                <span>Admin</span>
                <span className="text-xs text-gray-500 mt-1">Full system access</span>
              </button>
            </div>
          </div>

          {error && (
            <div className="text-red-600 text-sm bg-red-50 border border-red-100 rounded-md p-3">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isCreating}
            className={`w-full flex justify-center py-3 px-4 rounded-md text-white font-medium transition-colors ${
              isCreating
                ? 'bg-gray-400 cursor-not-allowed'
                : role === 'admin'
                ? 'bg-purple-500 hover:bg-purple-600'
                : 'bg-blue-500 hover:bg-blue-600'
            }`}
          >
            {isCreating ? 'Creating...' : 'Create Invitation'}
          </button>
        </form>
      </div>

      {/* Token Display Modal */}
      {showToken && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-medium mb-2">Invitation Created!</h3>
            <p className="text-sm text-gray-600 mb-4">
              Share this token with the user. It will expire in 24 hours.
            </p>
            <div className="bg-gray-50 border border-gray-200 p-4 rounded-md font-mono text-sm mb-6 break-all">
              {showToken}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(showToken)
                }}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
              >
                Copy Token
              </button>
              <button
                onClick={handleCloseModal}
                className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invitations List */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Role
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Token
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Created
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Expires
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Delete
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {invitations.map(invitation => {
              const isExpired = new Date(invitation.expires_at) < new Date()
              const isUsed = Boolean(invitation.used_at)
              const isRevealed = revealedTokens.has(invitation.id)
              
              return (
                <tr key={invitation.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {invitation.email}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      invitation.role === 'admin'
                        ? 'bg-purple-100 text-purple-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {invitation.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-sm">
                        {isRevealed ? invitation.token : '••••••••'}
                      </span>
                      <button
                        onClick={() => handleTokenVisibility(invitation.id, isRevealed)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        {isRevealed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                      <button
                        onClick={() => handleCopyToken(invitation.token)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      isUsed
                        ? 'bg-green-100 text-green-800'
                        : isExpired
                        ? 'bg-red-100 text-red-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {isUsed ? 'Used' : isExpired ? 'Expired' : 'Pending'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(invitation.created_at).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(invitation.expires_at).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => handleDeleteInvitation(invitation.id, isUsed)}
                      disabled={isUsed}
                      className={`inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded ${
                        isUsed
                          ? 'text-gray-400 cursor-not-allowed'
                          : 'text-red-600 hover:text-red-700 focus:outline-none'
                      }`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
} 