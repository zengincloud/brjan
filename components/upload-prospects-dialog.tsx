"use client"

import { useState, useRef } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { useToast } from "@/components/ui/use-toast"
import { Upload, FileText, Loader2, CheckCircle2, XCircle, AlertTriangle } from "lucide-react"

type UploadProspectsDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onUploadComplete: () => void
}

type UploadResult = {
  count: number
  total: number
  duplicates: number
  errors: number
  creditsExhausted: boolean
  message: string
}

export function UploadProspectsDialog({ open, onOpenChange, onUploadComplete }: UploadProspectsDialogProps) {
  const { toast } = useToast()
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<UploadResult | null>(null)
  const [rowCount, setRowCount] = useState<number | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [choosingFile, setChoosingFile] = useState(false)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setChoosingFile(false)
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0]
      setFile(selectedFile)
      setResult(null)

      // Count rows for preview
      const reader = new FileReader()
      reader.onload = (ev) => {
        const text = ev.target?.result as string
        if (text) {
          const lines = text.split("\n").filter((l) => l.trim().length > 0)
          setRowCount(Math.max(0, lines.length - 1)) // subtract header
        }
      }
      reader.readAsText(selectedFile)
    }
  }

  const handleBrowseClick = () => {
    setChoosingFile(true)
    fileInputRef.current?.click()
    // Reset after a delay in case the user cancels the file picker
    setTimeout(() => setChoosingFile(false), 3000)
  }

  const handleUpload = async () => {
    if (!file) return

    try {
      setUploading(true)
      setResult(null)
      const formData = new FormData()
      formData.append("file", file)

      const response = await fetch("/api/prospects/bulk-upload", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to upload prospects")
      }

      const data = await response.json()
      setResult(data)

      if (data.count > 0) {
        onUploadComplete()
      }
    } catch (error: any) {
      console.error(error)
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload prospects",
        variant: "destructive",
      })
    } finally {
      setUploading(false)
    }
  }

  const handleClose = () => {
    onOpenChange(false)
    // Reset state after dialog closes
    setTimeout(() => {
      setFile(null)
      setResult(null)
      setRowCount(null)
    }, 200)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upload Prospects</DialogTitle>
          <DialogDescription>
            Upload a CSV file with your prospects. Supported columns:
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Supported fields */}
          <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3 space-y-1">
            <p><strong>Required:</strong> name, email</p>
            <p><strong>Optional:</strong> title, company, phone, location, linkedin, industry</p>
            <p className="text-muted-foreground/70">Column names are case-insensitive (e.g. Name, EMAIL, Phone all work)</p>
          </div>

          {/* File picker */}
          <div className="space-y-2">
            <Label>CSV File</Label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
              disabled={uploading}
            />

            {!file ? (
              <Button
                variant="outline"
                className="w-full h-24 border-dashed flex flex-col gap-2"
                onClick={handleBrowseClick}
                disabled={uploading}
              >
                {choosingFile ? (
                  <>
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Opening file browser...</span>
                  </>
                ) : (
                  <>
                    <Upload className="h-6 w-6 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Click to browse for a CSV file</span>
                  </>
                )}
              </Button>
            ) : (
              <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  <div>
                    <p className="text-sm font-medium">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {rowCount !== null ? `${rowCount} prospect${rowCount !== 1 ? "s" : ""} found` : "Reading file..."}
                    </p>
                  </div>
                </div>
                {!uploading && !result && (
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={handleBrowseClick}>
                    Change
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Upload progress */}
          {uploading && (
            <div className="space-y-3 p-4 rounded-lg border bg-muted/20">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <p className="text-sm font-medium">Uploading prospects...</p>
              </div>
              <Progress value={undefined} className="h-2" />
              <p className="text-xs text-muted-foreground">
                Processing {rowCount || "your"} prospects, creating accounts, and linking data. This may take a moment.
              </p>
            </div>
          )}

          {/* Results */}
          {result && (
            <div className="space-y-2 p-4 rounded-lg border bg-muted/20">
              <div className="flex items-center gap-2">
                {result.count > 0 ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                ) : (
                  <XCircle className="h-5 w-5 text-destructive" />
                )}
                <p className="text-sm font-medium">
                  {result.count > 0 ? "Upload complete" : "No prospects created"}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                  <span>{result.count} created</span>
                </div>
                {result.duplicates > 0 && (
                  <div className="flex items-center gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5 text-yellow-500" />
                    <span>{result.duplicates} duplicates</span>
                  </div>
                )}
                {result.errors > 0 && (
                  <div className="flex items-center gap-1.5">
                    <XCircle className="h-3.5 w-3.5 text-destructive" />
                    <span>{result.errors} errors</span>
                  </div>
                )}
                {result.creditsExhausted && (
                  <div className="flex items-center gap-1.5 col-span-2">
                    <AlertTriangle className="h-3.5 w-3.5 text-yellow-500" />
                    <span className="text-xs">Credits exhausted — upgrade for more</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          {result ? (
            <Button onClick={handleClose}>Done</Button>
          ) : (
            <>
              <Button variant="outline" onClick={handleClose} disabled={uploading}>
                Cancel
              </Button>
              <Button onClick={handleUpload} disabled={!file || uploading}>
                {uploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload {rowCount ? `${rowCount} prospects` : ""}
                  </>
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
