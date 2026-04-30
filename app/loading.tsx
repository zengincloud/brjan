import { BRLoader } from "@/components/ui/br-loader"

export default function Loading() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
      <BRLoader />
    </div>
  )
}
