import { SDRPerformanceChart } from "@/components/sdr-performance-chart"
import { TaskBoard } from "@/components/task-board"
import { DashboardOverview } from "@/components/dashboard-overview"
import { OnboardingChecklist } from "@/components/onboarding-checklist"
import { WelcomeModal } from "@/components/welcome-modal"

interface DashboardPageProps {
  searchParams: Promise<{ welcome?: string }>
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const params = await searchParams
  const showWelcome = params.welcome === 'true'

  return (
    <div className="space-y-6">
      <WelcomeModal show={showWelcome} />
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Dashboard</h1>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/10 border border-accent/20">
          <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
          <span className="text-sm text-accent font-medium">System Active</span>
        </div>
      </div>
      <OnboardingChecklist showHero={showWelcome} />
      <DashboardOverview />
      <div className="w-full">
        <SDRPerformanceChart />
      </div>
      <TaskBoard />
    </div>
  )
}
