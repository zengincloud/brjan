import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - api/calls/twiml (Twilio webhook endpoint)
     * - api/calls/recording-status (Twilio recording webhook)
     * - api/calls/transcription-status (Twilio transcription webhook)
     */
    '/((?!_next/static|_next/image|favicon.ico|api/calls/twiml|api/calls/recording-status|api/calls/transcription-status|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
