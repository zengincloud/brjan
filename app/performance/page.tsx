import { SDRPerformanceChart } from "@/components/sdr-performance-chart"

export default function PerformancePage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-semibold mb-6">SDR Performance Dashboard</h1>
      <SDRPerformanceChart />
    </div>
  )
}
