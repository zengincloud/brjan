export function BRLoader() {
  return (
    <div className="relative" style={{ width: 216, height: 216 }}>
      <div className="br-loading-ring" style={{ inset: -54 }} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brgradientfav.png" alt="Boilerroom" style={{ width: 216, height: 216, borderRadius: "50%" }} />
    </div>
  )
}
