import { createClient } from 'shared/src/lib/supabase'

interface SignUpWithTokenResponse {
  error?: string
  user?: {
    id: string
    email: string
    // Add other user fields we might need
  }
}

export async function signUpWithToken(
  email: string,
  password: string,
  token: string
): Promise<SignUpWithTokenResponse> {
  try {
    const supabase = createClient()
    
    const { data, error } = await supabase.functions.invoke('signup-with-token', {
      body: {
        email,
        password,
        token,
      },
    })

    if (error) {
      console.error('Error calling signup-with-token:', error)
      return { error: error.message }
    }

    // Check if data contains an error message
    if (data && 'error' in data) {
      console.error('Edge function returned error:', data.error)
      return { error: data.error as string }
    }

    // If we have a user, return success
    if (data && 'user' in data) {
      return data as SignUpWithTokenResponse
    }

    // Unexpected response format
    console.error('Unexpected response format:', data)
    return { error: 'Unexpected response from server' }

  } catch (err) {
    console.error('Error in signUpWithToken:', err)
    return { error: err instanceof Error ? err.message : 'An error occurred during signup' }
  }
} 