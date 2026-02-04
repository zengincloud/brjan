// AssemblyAI Transcription Service
// Handles audio transcription with speaker diarization

const ASSEMBLYAI_API_KEY = process.env.ASSEMBLYAI_API_KEY

interface TranscriptWord {
  text: string
  start: number
  end: number
  confidence: number
  speaker: string | null
}

interface TranscriptUtterance {
  speaker: string
  text: string
  start: number
  end: number
  confidence: number
  words: TranscriptWord[]
}

export interface TranscriptionResult {
  id: string
  status: "queued" | "processing" | "completed" | "error"
  text: string | null
  utterances: TranscriptUtterance[] | null
  words: TranscriptWord[] | null
  audio_duration: number | null
  error: string | null
}

export interface FormattedTranscript {
  fullText: string
  segments: {
    speaker: string
    text: string
    startTime: number
    endTime: number
  }[]
  duration: number
}

/**
 * Submit an audio file URL for transcription
 * Returns the transcript ID for polling
 */
export async function submitTranscription(audioUrl: string): Promise<{ id: string; error?: string }> {
  if (!ASSEMBLYAI_API_KEY) {
    return { id: "", error: "AssemblyAI API key not configured" }
  }

  try {
    const response = await fetch("https://api.assemblyai.com/v2/transcript", {
      method: "POST",
      headers: {
        "Authorization": ASSEMBLYAI_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        audio_url: audioUrl,
        speaker_labels: true, // Enable speaker diarization
        speakers_expected: 2, // Expecting 2 speakers (caller and prospect)
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      console.error("AssemblyAI submission error:", error)
      return { id: "", error: error.error || "Failed to submit transcription" }
    }

    const data = await response.json()
    return { id: data.id }
  } catch (error: any) {
    console.error("AssemblyAI submission error:", error)
    return { id: "", error: error.message || "Failed to submit transcription" }
  }
}

/**
 * Check the status of a transcription job
 */
export async function getTranscriptionStatus(transcriptId: string): Promise<TranscriptionResult> {
  if (!ASSEMBLYAI_API_KEY) {
    return {
      id: transcriptId,
      status: "error",
      text: null,
      utterances: null,
      words: null,
      audio_duration: null,
      error: "AssemblyAI API key not configured",
    }
  }

  try {
    const response = await fetch(`https://api.assemblyai.com/v2/transcript/${transcriptId}`, {
      headers: {
        "Authorization": ASSEMBLYAI_API_KEY,
      },
    })

    if (!response.ok) {
      const error = await response.json()
      return {
        id: transcriptId,
        status: "error",
        text: null,
        utterances: null,
        words: null,
        audio_duration: null,
        error: error.error || "Failed to get transcription status",
      }
    }

    const data = await response.json()

    return {
      id: data.id,
      status: data.status,
      text: data.text,
      utterances: data.utterances,
      words: data.words,
      audio_duration: data.audio_duration,
      error: data.error,
    }
  } catch (error: any) {
    console.error("AssemblyAI status check error:", error)
    return {
      id: transcriptId,
      status: "error",
      text: null,
      utterances: null,
      words: null,
      audio_duration: null,
      error: error.message || "Failed to check transcription status",
    }
  }
}

/**
 * Format transcription result into a readable format with speaker labels
 * Maps Speaker A/B to "You" and "Prospect" based on who spoke first
 */
export function formatTranscript(
  result: TranscriptionResult,
  callerName: string = "You",
  prospectName: string = "Prospect"
): FormattedTranscript | null {
  if (result.status !== "completed" || !result.utterances) {
    return null
  }

  // Map speaker labels to names
  // Typically, the person who initiated the call speaks first
  const speakerMap: { [key: string]: string } = {}
  let speakerCount = 0

  const segments = result.utterances.map((utterance) => {
    // Assign names to speakers as they appear
    if (!speakerMap[utterance.speaker]) {
      speakerCount++
      // First speaker is usually the caller (you)
      speakerMap[utterance.speaker] = speakerCount === 1 ? callerName : prospectName
    }

    return {
      speaker: speakerMap[utterance.speaker],
      text: utterance.text,
      startTime: utterance.start / 1000, // Convert ms to seconds
      endTime: utterance.end / 1000,
    }
  })

  return {
    fullText: result.text || "",
    segments,
    duration: result.audio_duration || 0,
  }
}

/**
 * Format time in seconds to MM:SS format
 */
export function formatTimestamp(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, "0")}`
}
