import { App, LogLevel } from "@slack/bolt"
import { handleMessage } from "./handlers"
import { startScheduler } from "./scheduler"

// ─── Validate env vars ─────────────────────────────────────────

const requiredEnv = ["SLACK_BOT_TOKEN", "SLACK_APP_TOKEN", "SLACK_SIGNING_SECRET", "GROK_API_KEY", "DATABASE_URL"]
for (const key of requiredEnv) {
  if (!process.env[key] || process.env[key]?.includes("PLACEHOLDER")) {
    console.error(`Missing or placeholder env var: ${key}`)
    process.exit(1)
  }
}

// ─── Initialize Slack Bolt app (Socket Mode) ───────────────────

const app = new App({
  token: process.env.SLACK_BOT_TOKEN!,
  appToken: process.env.SLACK_APP_TOKEN!,
  signingSecret: process.env.SLACK_SIGNING_SECRET!,
  socketMode: true,
  logLevel: LogLevel.INFO,
})

// ─── Cache: Slack user ID → email ──────────────────────────────

const emailCache = new Map<string, string>()

async function getEmailForSlackUser(userId: string): Promise<string | null> {
  if (emailCache.has(userId)) return emailCache.get(userId)!

  try {
    const result = await app.client.users.info({ user: userId })
    const email = result.user?.profile?.email
    if (email) {
      emailCache.set(userId, email)
      return email
    }
  } catch (err) {
    console.error(`Failed to look up email for Slack user ${userId}:`, err)
  }
  return null
}

// ─── Handle DMs ────────────────────────────────────────────────

app.message(async ({ message, say }) => {
  // Only handle actual user messages (not bot messages, edits, etc.)
  if (message.subtype) return
  if (!("text" in message) || !message.text) return
  if (!("user" in message) || !message.user) return

  const text = message.text.trim()
  if (!text) return

  // Strip bot mention if present (e.g. "<@U123> what's my day")
  const cleanText = text.replace(/<@[A-Z0-9]+>/g, "").trim()
  if (!cleanText) return

  // Look up the Slack user's email → match to Boilerroom user
  const email = await getEmailForSlackUser(message.user)
  if (!email) {
    await say("I can't figure out your email from Slack. Make sure your Slack profile has an email set!")
    return
  }

  console.log(`[bot] Message from ${email}: "${cleanText}"`)

  try {
    const response = await handleMessage(cleanText, email)
    await say(response)
  } catch (err) {
    console.error(`[bot] Error handling message:`, err)
    await say("oof, something broke on my end. try again in a sec?")
  }
})

// ─── Handle @mentions in channels ──────────────────────────────

app.event("app_mention", async ({ event, say }) => {
  const text = event.text.replace(/<@[A-Z0-9]+>/g, "").trim()
  if (!text) {
    await say("yo, what's up? ask me about your day, stats, or how things went!")
    return
  }

  if (!event.user) {
    await say("can't figure out who you are!")
    return
  }

  const email = await getEmailForSlackUser(event.user)
  if (!email) {
    await say("can't figure out who you are — make sure your Slack email matches your Boilerroom account!")
    return
  }

  console.log(`[bot] Mention from ${email}: "${text}"`)

  try {
    const response = await handleMessage(text, email)
    await say(response)
  } catch (err) {
    console.error(`[bot] Error handling mention:`, err)
    await say("something went sideways, give me another shot?")
  }
})

// ─── Start ─────────────────────────────────────────────────────

async function main() {
  await app.start()
  console.log("\n⚡ BoilerRoom Bot is running!")
  console.log("  • Socket Mode: connected")
  console.log("  • Listening for DMs and @mentions\n")

  // Start scheduled messages (morning brief, EOD recap, reminders)
  startScheduler(app)
}

main().catch((err) => {
  console.error("Failed to start BoilerRoom Bot:", err)
  process.exit(1)
})
