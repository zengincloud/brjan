// Ending the rep's own browser leg (call.disconnect()) relies on Twilio's
// endConferenceOnExit to also drop the prospect's leg, which only takes effect
// once that leg has actually joined the conference — if the rep hangs up while
// the prospect's phone is still ringing (or any other timing edge case), the
// prospect's leg is left live. This forces the server to hang it up directly
// via the Twilio REST API regardless of what state that leg is in.
export function forceHangupCall(callId: string | null | undefined) {
  if (!callId) return
  fetch(`/api/calls/${callId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ hangup: true }),
  }).catch(() => {})
}
