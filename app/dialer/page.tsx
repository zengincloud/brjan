"use client"

import dynamic from "next/dynamic"

const DialerContent = dynamic(() => import("./dialer-content"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-[60vh]">
      <div className="relative" style={{ width: 72, height: 72 }}>
        <div className="br-loading-ring" style={{ inset: -18 }} />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brgradientfav.png" alt="Boilerroom" style={{ width: 72, height: 72, borderRadius: "50%" }} />
      </div>
    </div>
  ),
})

export default function DialerPage() {
  return <DialerContent />
}
