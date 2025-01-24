import { useState } from 'react'
import { Button } from './ui/Button'
import { checkNewEmails } from '../services/email'
import { createClient } from '../lib/supabase'

export function CheckEmailsButton() {
  const [isChecking, setIsChecking] = useState(false)
  const [notification, setNotification] = useState<{
    type: 'success' | 'error',
    message: string
  } | null>(null)
  const supabase = createClient()

  const handleCheck = async () => {
    setIsChecking(true)
    setNotification(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const result = await checkNewEmails(session?.access_token || '')
      
      // Show success message with details
      if (result.processed === 0) {
        setNotification({
          type: 'success',
          message: 'No new emails found to process.'
        })
      } else {
        const successCount = result.results.filter(r => r.success).length
        setNotification({
          type: 'success',
          message: `Processed ${result.processed} emails. Created ${successCount} new tickets.`
        })
      }
    } catch (error) {
      console.error('Failed to check emails:', error)
      setNotification({
        type: 'error',
        message: error instanceof Error ? error.message : 'An error occurred while checking emails'
      })
    } finally {
      setIsChecking(false)
    }
  }

  return (
    <div className="space-y-2">
      {notification && (
        <div className={`p-4 text-sm rounded-md ${
          notification.type === 'success' 
            ? 'bg-green-50 text-green-700 border border-green-200'
            : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {notification.message}
        </div>
      )}
      <Button 
        onClick={handleCheck} 
        disabled={isChecking}
        variant="outline"
      >
        {isChecking ? 'Checking...' : 'Check New Emails'}
      </Button>
    </div>
  )
} 