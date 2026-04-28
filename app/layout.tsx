import type React from "react"
import "@/styles/globals.css"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { Toaster } from "@/components/ui/toaster"
import { DashboardShell } from "@/components/dashboard-shell"
import { ToastContextProvider } from "@/components/ui/toast"
import { VoiceOrb } from "@/components/voice-orb"

export const metadata = {
  title: "boilerroom.ai",
  description: "AI-powered sales engagement platform",
  generator: "v0.app",
  icons: {
    icon: "/brgradientfav.png",
    apple: "/brgradientfav.png",
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable} dark antialiased`}>
      <body className="font-sans">
        <ToastContextProvider>
          <DashboardShell>{children}</DashboardShell>
          <VoiceOrb />
          <Toaster />
        </ToastContextProvider>
      </body>
    </html>
  )
}
