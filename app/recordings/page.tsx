import { RecordingsList } from "@/components/recordings-list"

export default function RecordingsPage() {
  return (
    <div className="space-y-5 p-6">
      <div>
        <h1 className="text-[15px] font-semibold text-foreground">Call Reports</h1>
        <p className="text-[12px] text-muted-foreground mt-0.5">
          Call history, recordings, and transcriptions
        </p>
      </div>

      <RecordingsList />
    </div>
  )
}
