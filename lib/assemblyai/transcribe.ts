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

interface SentimentResult {
  text: string
  start: number
  end: number
  sentiment: "POSITIVE" | "NEUTRAL" | "NEGATIVE"
  confidence: number
  speaker: string | null
}

export interface TranscriptionResult {
  id: string
  status: "queued" | "processing" | "completed" | "error"
  text: string | null
  utterances: TranscriptUtterance[] | null
  words: TranscriptWord[] | null
  sentiment_analysis_results: SentimentResult[] | null
  audio_duration: number | null
  error: string | null
}

export interface CallAnalysis {
  sentiment: "positive" | "neutral" | "negative" | "mixed"
  sentimentScore: number // -1 to 1
  outcome: "interested" | "not_interested" | "follow_up" | "meeting_booked" | "voicemail" | "gatekeeper" | "unknown"
  summary: string
  keyPoints: string[]
  nextSteps: string | null
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
  analysis?: CallAnalysis
}

/**
 * Upload audio file to AssemblyAI's servers
 * This is needed for Twilio recordings which require authentication
 */
export async function uploadAudioToAssemblyAI(
  audioBuffer: Buffer
): Promise<{ upload_url: string; error?: string }> {
  if (!ASSEMBLYAI_API_KEY) {
    return { upload_url: "", error: "AssemblyAI API key not configured" }
  }

  try {
    // Convert Buffer to Uint8Array for fetch compatibility
    const uint8Array = new Uint8Array(audioBuffer)

    const response = await fetch("https://api.assemblyai.com/v2/upload", {
      method: "POST",
      headers: {
        "Authorization": ASSEMBLYAI_API_KEY,
        "Content-Type": "application/octet-stream",
      },
      body: uint8Array,
    })

    if (!response.ok) {
      const error = await response.json()
      console.error("AssemblyAI upload error:", error)
      return { upload_url: "", error: error.error || "Failed to upload audio" }
    }

    const data = await response.json()
    return { upload_url: data.upload_url }
  } catch (error: any) {
    console.error("AssemblyAI upload error:", error)
    return { upload_url: "", error: error.message || "Failed to upload audio" }
  }
}

/**
 * Fetch audio from a URL with optional Basic Auth
 */
export async function fetchAudioWithAuth(
  url: string,
  username?: string,
  password?: string
): Promise<{ buffer: Buffer; error?: string }> {
  try {
    const headers: Record<string, string> = {}

    if (username && password) {
      const auth = Buffer.from(`${username}:${password}`).toString("base64")
      headers["Authorization"] = `Basic ${auth}`
    }

    console.log("Fetching audio from:", url.replace(/:[^:@]+@/, ":***@"))

    const response = await fetch(url, { headers })

    if (!response.ok) {
      console.error("Failed to fetch audio:", response.status, response.statusText)
      return { buffer: Buffer.from([]), error: `Failed to fetch audio: ${response.status}` }
    }

    const arrayBuffer = await response.arrayBuffer()
    return { buffer: Buffer.from(arrayBuffer) }
  } catch (error: any) {
    console.error("Error fetching audio:", error)
    return { buffer: Buffer.from([]), error: error.message || "Failed to fetch audio" }
  }
}

/**
 * Submit an audio file URL for transcription
 * For Twilio URLs, fetches the audio and uploads to AssemblyAI first
 * Returns the transcript ID for polling
 */
export async function submitTranscription(
  audioUrl: string,
  twilioAccountSid?: string,
  twilioAuthToken?: string
): Promise<{ id: string; error?: string }> {
  if (!ASSEMBLYAI_API_KEY) {
    return { id: "", error: "AssemblyAI API key not configured" }
  }

  try {
    let finalAudioUrl = audioUrl

    // Check if this is a Twilio URL that needs authentication
    const isTwilioUrl = audioUrl.includes("api.twilio.com") || audioUrl.includes("twilio.com")

    if (isTwilioUrl && twilioAccountSid && twilioAuthToken) {
      console.log("Detected Twilio URL, fetching and uploading to AssemblyAI...")

      // Fetch the audio from Twilio with auth
      const { buffer, error: fetchError } = await fetchAudioWithAuth(
        audioUrl,
        twilioAccountSid,
        twilioAuthToken
      )

      if (fetchError || buffer.length === 0) {
        return { id: "", error: fetchError || "Failed to fetch audio from Twilio" }
      }

      console.log(`Fetched ${buffer.length} bytes, uploading to AssemblyAI...`)

      // Upload to AssemblyAI
      const { upload_url, error: uploadError } = await uploadAudioToAssemblyAI(buffer)

      if (uploadError || !upload_url) {
        return { id: "", error: uploadError || "Failed to upload audio to AssemblyAI" }
      }

      console.log("Audio uploaded to AssemblyAI, submitting for transcription...")
      finalAudioUrl = upload_url
    }

    const response = await fetch("https://api.assemblyai.com/v2/transcript", {
      method: "POST",
      headers: {
        "Authorization": ASSEMBLYAI_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        audio_url: finalAudioUrl,
        speech_model: "best", // Use best model for accuracy
        speaker_labels: true, // Enable speaker diarization
        speakers_expected: 2, // Expecting 2 speakers (caller and prospect)
        sentiment_analysis: true, // Enable sentiment analysis
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
      sentiment_analysis_results: null,
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
        sentiment_analysis_results: null,
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
      sentiment_analysis_results: data.sentiment_analysis_results,
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
      sentiment_analysis_results: null,
      audio_duration: null,
      error: error.message || "Failed to check transcription status",
    }
  }
}

/**
 * Analyze transcript using AssemblyAI LeMUR for call outcome
 */
export async function analyzeTranscript(transcriptId: string): Promise<CallAnalysis | null> {
  if (!ASSEMBLYAI_API_KEY) {
    return null
  }

  try {
    const response = await fetch("https://api.assemblyai.com/lemur/v3/generate/task", {
      method: "POST",
      headers: {
        "Authorization": ASSEMBLYAI_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        transcript_ids: [transcriptId],
        prompt: `Analyze this sales call transcript and provide:
1. Overall sentiment (positive, neutral, negative, or mixed)
2. Call outcome - choose one: interested (prospect showed interest), not_interested (prospect declined), follow_up (needs follow up), meeting_booked (meeting was scheduled), voicemail (left voicemail), gatekeeper (spoke to gatekeeper not decision maker), unknown
3. A brief 1-2 sentence summary of the call
4. 2-4 key points from the conversation
5. Recommended next steps if any

Respond in this exact JSON format:
{
  "sentiment": "positive|neutral|negative|mixed",
  "outcome": "interested|not_interested|follow_up|meeting_booked|voicemail|gatekeeper|unknown",
  "summary": "Brief summary here",
  "keyPoints": ["point 1", "point 2"],
  "nextSteps": "Next steps or null"
}`,
        final_model: "anthropic/claude-3-haiku",
      }),
    })

    if (!response.ok) {
      console.error("LeMUR analysis error:", await response.text())
      return null
    }

    const data = await response.json()

    // Parse the LeMUR response
    try {
      const analysisText = data.response
      // Extract JSON from the response
      const jsonMatch = analysisText.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        return {
          sentiment: parsed.sentiment || "neutral",
          sentimentScore: parsed.sentiment === "positive" ? 0.7 : parsed.sentiment === "negative" ? -0.7 : 0,
          outcome: parsed.outcome || "unknown",
          summary: parsed.summary || "",
          keyPoints: parsed.keyPoints || [],
          nextSteps: parsed.nextSteps || null,
        }
      }
    } catch (parseError) {
      console.error("Error parsing LeMUR response:", parseError)
    }

    return null
  } catch (error: any) {
    console.error("LeMUR analysis error:", error)
    return null
  }
}

/**
 * Calculate overall sentiment from sentiment analysis results
 */
export function calculateOverallSentiment(
  sentimentResults: SentimentResult[] | null
): { sentiment: "positive" | "neutral" | "negative" | "mixed"; score: number } {
  if (!sentimentResults || sentimentResults.length === 0) {
    return { sentiment: "neutral", score: 0 }
  }

  let positiveCount = 0
  let negativeCount = 0
  let neutralCount = 0
  let totalConfidence = 0

  sentimentResults.forEach((result) => {
    const weight = result.confidence
    totalConfidence += weight

    if (result.sentiment === "POSITIVE") positiveCount += weight
    else if (result.sentiment === "NEGATIVE") negativeCount += weight
    else neutralCount += weight
  })

  const total = positiveCount + negativeCount + neutralCount
  if (total === 0) return { sentiment: "neutral", score: 0 }

  const positiveRatio = positiveCount / total
  const negativeRatio = negativeCount / total

  // Calculate score from -1 to 1
  const score = positiveRatio - negativeRatio

  // Determine sentiment category
  if (positiveRatio > 0.4 && negativeRatio > 0.3) {
    return { sentiment: "mixed", score }
  } else if (positiveRatio > 0.5) {
    return { sentiment: "positive", score }
  } else if (negativeRatio > 0.5) {
    return { sentiment: "negative", score }
  }

  return { sentiment: "neutral", score }
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
  if (result.status !== "completed" || !result.text) {
    return null
  }

  // Map speaker labels to names
  // Typically, the person who initiated the call speaks first
  const speakerMap: { [key: string]: string } = {}
  let speakerCount = 0

  let segments: FormattedTranscript["segments"] = []

  // Try to use utterances first (preferred for speaker diarization)
  if (result.utterances && result.utterances.length > 0) {
    segments = result.utterances.map((utterance) => {
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
  } else if (result.words && result.words.length > 0) {
    // Fallback: Try to build segments from words with speaker labels
    let currentSegment: { speaker: string; text: string; startTime: number; endTime: number } | null = null

    for (const word of result.words) {
      const speakerLabel = word.speaker || "A"

      if (!speakerMap[speakerLabel]) {
        speakerCount++
        speakerMap[speakerLabel] = speakerCount === 1 ? callerName : prospectName
      }

      const speakerName = speakerMap[speakerLabel]

      if (!currentSegment || currentSegment.speaker !== speakerName) {
        // Start new segment
        if (currentSegment) {
          segments.push(currentSegment)
        }
        currentSegment = {
          speaker: speakerName,
          text: word.text,
          startTime: word.start / 1000,
          endTime: word.end / 1000,
        }
      } else {
        // Append to current segment
        currentSegment.text += " " + word.text
        currentSegment.endTime = word.end / 1000
      }
    }

    // Don't forget the last segment
    if (currentSegment) {
      segments.push(currentSegment)
    }
  }

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
