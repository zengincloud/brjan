'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function TestAuthPage() {
  const [result, setResult] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const testSignup = async () => {
    setLoading(true)
    setResult('')

    try {
      const testEmail = `test-${Date.now()}@example.com`
      const testPassword = 'test123456'

      const { data, error } = await supabase.auth.signUp({
        email: testEmail,
        password: testPassword,
      })

      if (error) {
        setResult(`❌ Error: ${error.message}\n\nThis likely means Email authentication is not enabled in Supabase.\n\nTo fix:\n1. Go to https://supabase.com/dashboard/project/cxadvfdlyxctzbcculdb/auth/providers\n2. Enable the "Email" provider\n3. Set "Confirm email" to OFF for testing\n4. Click Save\n5. Try again`)
      } else {
        setResult(`✅ Success! Email auth is working.\n\nUser created: ${data.user?.email}`)
      }
    } catch (err: any) {
      setResult(`❌ Error: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Supabase Auth Diagnostic</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Click the button below to test if Supabase Email authentication is enabled.
          </p>

          <Button
            onClick={testSignup}
            disabled={loading}
            className="w-full"
          >
            {loading ? 'Testing...' : 'Test Email Signup'}
          </Button>

          {result && (
            <div className="p-4 bg-muted rounded-lg">
              <pre className="text-sm whitespace-pre-wrap">{result}</pre>
            </div>
          )}

          <div className="text-xs text-muted-foreground space-y-2">
            <p><strong>Supabase URL:</strong> {process.env.NEXT_PUBLIC_SUPABASE_URL}</p>
            <p><strong>Anon Key:</strong> {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.slice(0, 20)}...</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
