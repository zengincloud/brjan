import { RecordingsList } from "@/components/recordings-list"

export default function RecordingsPage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Call History</h1>
        <p className="text-muted-foreground">
          View call history, recordings, and transcriptions
        </p>
      </div>

      <RecordingsList />
    </div>
  )
}
