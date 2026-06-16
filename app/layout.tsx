import type React from "react"
import "@/styles/globals.css"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { Toaster } from "@/components/ui/toaster"
import { Toaster as SonnerToaster } from "sonner"
import { DashboardShell } from "@/components/dashboard-shell"
import { ToastContextProvider } from "@/components/ui/toast"
import { HubSpotChatScript } from "@/components/hubspot-chat-script"

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
          <Toaster />
          <SonnerToaster position="bottom-right" />
        </ToastContextProvider>
        <HubSpotChatScript />
      </body>
    </html>
  )
}
