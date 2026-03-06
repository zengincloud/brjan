import cron from "node-cron"
import type { App } from "@slack/bolt"
import { getAllActiveUsers, getUpcomingTasks } from "./db"
import { buildMorningBrief, buildEodRecap } from "./handlers"
import * as grok from "./grok"

// Cache: Slack email → Slack user ID (so we can DM them)
const slackUserCache = new Map<string, string>()

async function getSlackUserId(app: App, email: string): Promise<string | null> {
  if (slackUserCache.has(email)) return slackUserCache.get(email)!

  try {
    const result = await app.client.users.lookupByEmail({ email })
    if (result.user?.id) {
      slackUserCache.set(email, result.user.id)
      return result.user.id
    }
  } catch {
    // User not in Slack workspace
  }
  return null
}

async function sendDM(app: App, slackUserId: string, text: string) {
  try {
    const dm = await app.client.conversations.open({ users: slackUserId })
    if (dm.channel?.id) {
      await app.client.chat.postMessage({
        channel: dm.channel.id,
        text,
      })
    }
  } catch (err) {
    console.error(`Failed to send DM to ${slackUserId}:`, err)
  }
}

// ─── Morning briefing ──────────────────────────────────────────
// Runs at 9:00 AM Mon-Fri (adjust per user timezone later)

function scheduleMorningBrief(app: App) {
  cron.schedule("0 9 * * 1-5", async () => {
    console.log("[scheduler] Running morning briefings...")
    const users = await getAllActiveUsers()

    for (const user of users) {
      const slackId = await getSlackUserId(app, user.email)
      if (!slackId) continue

      try {
        const message = await buildMorningBrief(user.id, user.timezone)
        await sendDM(app, slackId, message)
        console.log(`[scheduler] Sent morning brief to ${user.email}`)
      } catch (err) {
        console.error(`[scheduler] Failed morning brief for ${user.email}:`, err)
      }
    }
  }, { timezone: "America/Los_Angeles" })
}

// ─── Morning hype ─────────────────────────────────────────────
// Runs at 8:30 AM Mon-Fri PST — ALL CAPS encouragement

function scheduleMorningHype(app: App) {
  cron.schedule("30 8 * * 1-5", async () => {
    console.log("[scheduler] Running morning hype...")
    const users = await getAllActiveUsers()

    for (const user of users) {
      const slackId = await getSlackUserId(app, user.email)
      if (!slackId) continue

      try {
        const message = await grok.formatHypeUp()
        await sendDM(app, slackId, message)
        console.log(`[scheduler] Sent hype to ${user.email}`)
      } catch (err) {
        console.error(`[scheduler] Failed hype for ${user.email}:`, err)
      }
    }
  }, { timezone: "America/Los_Angeles" })
}

// ─── End of day recap ──────────────────────────────────────────
// Runs at 5:30 PM Mon-Fri

function scheduleEodRecap(app: App) {
  cron.schedule("30 17 * * 1-5", async () => {
    console.log("[scheduler] Running EOD recaps...")
    const users = await getAllActiveUsers()

    for (const user of users) {
      const slackId = await getSlackUserId(app, user.email)
      if (!slackId) continue

      try {
        const message = await buildEodRecap(user.id, user.timezone)
        await sendDM(app, slackId, message)
        console.log(`[scheduler] Sent EOD recap to ${user.email}`)
      } catch (err) {
        console.error(`[scheduler] Failed EOD recap for ${user.email}:`, err)
      }
    }
  }, { timezone: "America/Los_Angeles" })
}

// ─── Task reminders ────────────────────────────────────────────
// Runs every 15 minutes during work hours (9-5 Mon-Fri)

function scheduleTaskReminders(app: App) {
  cron.schedule("*/15 9-17 * * 1-5", async () => {
    const users = await getAllActiveUsers()

    for (const user of users) {
      const slackId = await getSlackUserId(app, user.email)
      if (!slackId) continue

      try {
        const tasks = await getUpcomingTasks(user.id, 20) // due within 20 min
        if (tasks.length === 0) continue

        const taskList = tasks.map((t) => {
          const contact = t.contact ? (t.contact as any).name || "" : ""
          return `• [${t.type}] ${t.title}${contact ? ` — ${contact}` : ""} (due ${t.dueDate?.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })})`
        }).join("\n")

        const message = await grok.formatReminder(
          `Tasks due in the next 20 minutes:\n${taskList}`
        )
        await sendDM(app, slackId, message)
      } catch (err) {
        // Silent — don't spam logs for reminder failures
      }
    }
  }, { timezone: "America/Los_Angeles" })
}

// ─── Start all schedules ───────────────────────────────────────

export function startScheduler(app: App) {
  scheduleMorningHype(app)
  scheduleMorningBrief(app)
  scheduleEodRecap(app)
  scheduleTaskReminders(app)
  console.log("[scheduler] All cron jobs scheduled")
  console.log("  • Morning hype: 8:30 AM Mon-Fri PT")
  console.log("  • Morning brief: 9:00 AM Mon-Fri PT")
  console.log("  • EOD recap: 5:30 PM Mon-Fri PT")
  console.log("  • Task reminders: every 15 min during 9-5 Mon-Fri PT")
}
