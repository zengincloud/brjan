export default function Loading() {
  return (
    <div className="flex items-center gap-2 py-12 text-muted-foreground">
      <div className="h-4 w-4 rounded-full border-2 border-accent border-t-transparent animate-spin" />
      <span className="text-sm font-medium">Thinking...</span>
    </div>
  )
}
