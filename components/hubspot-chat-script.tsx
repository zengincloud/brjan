'use client'

import { usePathname } from 'next/navigation'
import Script from 'next/script'

const AUTH_PAGES = ['/login', '/signup', '/reset-password', '/auth/callback', '/onboarding']

export function HubSpotChatScript() {
  const pathname = usePathname()
  const isAuthPage = AUTH_PAGES.some(page => pathname?.startsWith(page))

  if (isAuthPage) return null

  return (
    <Script id="hs-script-loader" src="//js-na3.hs-scripts.com/342995899.js" strategy="afterInteractive" />
  )
}
