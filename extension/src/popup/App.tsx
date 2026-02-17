import React, { useEffect, useState } from 'react'

type AuthStatus =
  | { state: 'loading' }
  | { state: 'unauthenticated' }
  | { state: 'authenticated'; user: { id: string; email: string; name?: string } }

/** Safe wrapper — if the service worker is down, chrome.runtime can be undefined */
function safeSendMessage(message: any, callback: (response: any) => void) {
  try {
    if (!chrome?.runtime?.sendMessage) {
      callback({ error: 'Extension context lost. Please close and reopen the popup.' })
      return
    }
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        callback({ error: chrome.runtime.lastError.message || 'Background service error' })
        return
      }
      callback(response)
    })
  } catch (err: any) {
    callback({ error: err.message || 'Failed to send message' })
  }
}

export function App() {
  const [auth, setAuth] = useState<AuthStatus>({ state: 'loading' })
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [logging, setLogging] = useState(false)
  const [googleLogging, setGoogleLogging] = useState(false)

  useEffect(() => {
    safeSendMessage({ type: 'GET_AUTH_STATE' }, (response) => {
      if (response?.error) {
        console.error('Boilerroom:', response.error)
        setAuth({ state: 'unauthenticated' })
        return
      }
      if (response?.authenticated) {
        setAuth({ state: 'authenticated', user: response.user })
      } else {
        setAuth({ state: 'unauthenticated' })
      }
    })
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLogging(true)

    safeSendMessage({ type: 'LOGIN', data: { email, password } }, (response) => {
      setLogging(false)
      if (response?.error) {
        setError(response.error)
      } else if (response?.authenticated) {
        setAuth({ state: 'authenticated', user: response.user })
      } else {
        setError('Login failed. Please try again.')
      }
    })
  }

  const handleLogout = () => {
    safeSendMessage({ type: 'LOGOUT' }, () => {
      setAuth({ state: 'unauthenticated' })
    })
  }

  const handleGoogleLogin = () => {
    setError('')
    setGoogleLogging(true)

    safeSendMessage({ type: 'LOGIN_GOOGLE' }, (response) => {
      setGoogleLogging(false)
      if (response?.error) {
        setError(response.error)
      } else if (response?.authenticated) {
        setAuth({ state: 'authenticated', user: response.user })
      }
    })
  }

  const openApp = () => {
    chrome.tabs.create({ url: 'https://app.boilerroom.ai' })
  }

  // Loading
  if (auth.state === 'loading') {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <div style={styles.logo}>BR</div>
          <span style={styles.headerTitle}>Boilerroom</span>
        </div>
        <div style={styles.body}>
          <p style={styles.loadingText}>Loading...</p>
        </div>
      </div>
    )
  }

  // Authenticated
  if (auth.state === 'authenticated') {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <div style={styles.logo}>BR</div>
          <span style={styles.headerTitle}>Boilerroom</span>
        </div>
        <div style={styles.body}>
          <div style={styles.userCard}>
            <div style={styles.userEmail}>{auth.user.name || auth.user.email}</div>
            <div style={styles.userStatus}>Connected</div>
          </div>

          <p style={styles.hint}>
            Visit a LinkedIn profile and click <strong>Reveal Contact</strong> in
            the floating panel to find emails and phone numbers.
          </p>

          <button style={styles.btnSecondary} onClick={openApp}>
            Open Boilerroom App
          </button>
          <button style={styles.btnLogout} onClick={handleLogout}>
            Sign Out
          </button>
        </div>
      </div>
    )
  }

  // Login form
  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.logo}>BR</div>
        <span style={styles.headerTitle}>Boilerroom</span>
      </div>
      <div style={styles.body}>
        <p style={styles.subtitle}>Sign in with your Boilerroom account</p>

        {error && <div style={styles.error}>{error}</div>}

        <button
          onClick={handleGoogleLogin}
          disabled={googleLogging || logging}
          style={{
            ...styles.btnGoogle,
            opacity: googleLogging ? 0.6 : 1,
          }}
        >
          <svg width="18" height="18" viewBox="0 0 48 48" style={{ marginRight: 8, flexShrink: 0 }}>
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
          </svg>
          {googleLogging ? 'Signing in...' : 'Continue with Google'}
        </button>

        <div style={styles.divider}>
          <span style={styles.dividerLine} />
          <span style={styles.dividerText}>or</span>
          <span style={styles.dividerLine} />
        </div>

        <form onSubmit={handleLogin}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={styles.input}
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={styles.input}
            required
          />
          <button
            type="submit"
            disabled={logging || googleLogging}
            style={{
              ...styles.btnPrimary,
              opacity: logging ? 0.6 : 1,
            }}
          >
            {logging ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  )
}

// Inline styles to avoid Tailwind dependency in popup (keeps bundle tiny)
const styles: Record<string, React.CSSProperties> = {
  container: {
    width: 360,
    minHeight: 200,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '14px 16px',
    background: '#1a1a2e',
    color: '#fff',
  },
  logo: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 28,
    height: 28,
    background: '#4CD112',
    borderRadius: 8,
    fontWeight: 700,
    fontSize: 11,
    letterSpacing: -0.5,
  },
  headerTitle: {
    fontWeight: 600,
    fontSize: 15,
  },
  body: {
    padding: 16,
  },
  subtitle: {
    color: '#6b7280',
    fontSize: 13,
    marginTop: 0,
    marginBottom: 16,
  },
  input: {
    display: 'block',
    width: '100%',
    padding: '10px 12px',
    marginBottom: 10,
    border: '1px solid #d1d5db',
    borderRadius: 8,
    fontSize: 13,
    outline: 'none',
    boxSizing: 'border-box',
  },
  btnGoogle: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    padding: '10px 16px',
    background: '#fff',
    color: '#3c4043',
    border: '1px solid #dadce0',
    borderRadius: 8,
    fontWeight: 500,
    fontSize: 13,
    cursor: 'pointer',
    marginBottom: 0,
    boxSizing: 'border-box' as const,
  },
  divider: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    margin: '14px 0',
  },
  dividerLine: {
    flex: 1,
    height: 1,
    background: '#e5e7eb',
  },
  dividerText: {
    color: '#9ca3af',
    fontSize: 12,
  },
  btnPrimary: {
    display: 'block',
    width: '100%',
    padding: '10px 16px',
    background: '#4CD112',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontWeight: 600,
    fontSize: 13,
    cursor: 'pointer',
  },
  btnSecondary: {
    display: 'block',
    width: '100%',
    padding: '10px 16px',
    background: '#f3f4f6',
    color: '#374151',
    border: 'none',
    borderRadius: 8,
    fontWeight: 600,
    fontSize: 13,
    cursor: 'pointer',
    marginBottom: 8,
  },
  btnLogout: {
    display: 'block',
    width: '100%',
    padding: '8px 16px',
    background: 'transparent',
    color: '#9ca3af',
    border: 'none',
    borderRadius: 8,
    fontSize: 12,
    cursor: 'pointer',
  },
  error: {
    background: '#fef2f2',
    color: '#991b1b',
    padding: '8px 12px',
    borderRadius: 8,
    fontSize: 12,
    marginBottom: 10,
  },
  userCard: {
    background: '#f0fdf4',
    border: '1px solid #bbf7d0',
    borderRadius: 10,
    padding: '12px 14px',
    marginBottom: 16,
  },
  userEmail: {
    fontWeight: 600,
    fontSize: 13,
    color: '#111827',
  },
  userStatus: {
    fontSize: 12,
    color: '#16a34a',
    marginTop: 2,
  },
  hint: {
    fontSize: 12,
    color: '#6b7280',
    lineHeight: '1.6',
    marginBottom: 16,
  },
  loadingText: {
    color: '#9ca3af',
    fontSize: 13,
    textAlign: 'center',
  },
}
