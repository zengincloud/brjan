export default function Loading() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
      <div className="relative" style={{ width: 72, height: 72 }}>
        <div className="br-loading-ring" style={{ inset: -18 }} />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/brgradientfav.png"
          alt="Boilerroom"
          style={{ width: 72, height: 72, borderRadius: '50%' }}
        />
      </div>
    </div>
  )
}
