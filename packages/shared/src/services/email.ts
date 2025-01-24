import { createClient } from '@supabase/supabase-js'
import { env } from '../config/env'

interface EmailProcessingResult {
  type: 'new' | 'reply' | 'skip'
  success: boolean
  emailId: string
  ticketId?: string
  ticketNumber?: number
  error?: string
  reason?: string
}

interface CheckEmailsResponse {
  processed: number
  results: EmailProcessingResult[]
}

export async function checkNewEmails(supabaseKey: string): Promise<CheckEmailsResponse> {
  const response = await fetch(`${env.supabase.url}/functions/v1/email-to-ticket`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json'
    }
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to check emails: ${error}`)
  }

  return response.json()
} 