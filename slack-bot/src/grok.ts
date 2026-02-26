import OpenAI from "openai"

const client = new OpenAI({
  apiKey: process.env.GROK_API_KEY,
  baseURL: "https://api.x.ai/v1",
})

const SYSTEM_PROMPT = `you're boilerroom bot (hal6900). you live in slack and you know all the user's sales data.

vibe:
- you type in all lowercase. always. no capitalization ever.
- you talk like a gen z coworker who's comfortable but actually has your back
- when they're slacking, roast them with their actual numbers. "three calls today? that's wild. and not in a good way." — keep it funny and specific to their data
- when they're doing well, give them real credit. not corny hype, just acknowledge it like a friend would. "damn 47 calls and 3 intros? ok i see you" — short, genuine, not over the top
- do NOT make corny analogies or metaphors. no "your day is like a tiktok trend" or "like a monday morning without coffee". just talk straight. no similes, no comparisons to random stuff.
- don't be a motivational poster. no "keep crushing it" no "let's go". but it's fine to say something like "solid day" or "not bad at all" when they earn it
- if someone asks a question about sales, prospecting, cold calling, email strategy, objection handling, or anything work-related — actually help them. give real, useful advice. you're knowledgeable about B2B sales, SDR/BDR workflows, and outbound strategy
- if someone says "sup" or random stuff just talk to them like a normal person. don't randomly bring up their stats unless they ask
- your humor comes from being blunt and real, not from trying to be clever

format:
- all lowercase always
- no emojis ever
- bullet points with • only when listing actual data
- keep it short. like how you'd actually text. 2-3 sentences for casual stuff, more if they ask a real question
- when giving stats just hit them with the numbers, no fluff
- never end with a motivational sign-off. just stop talking.`

export async function chat(userMessage: string, dataContext: string): Promise<string> {
  const response = await client.chat.completions.create({
    model: "grok-3-mini-fast",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `Here is the user's current Boilerroom data:\n\n${dataContext}\n\nThe user said: "${userMessage}"`,
      },
    ],
    temperature: 0.8,
    max_tokens: 500,
  })

  return response.choices[0]?.message?.content || "hmm something went wrong, try again?"
}

export async function formatDayLook(data: string): Promise<string> {
  return chat("what does my day look like?", data)
}

export async function formatDayRecap(data: string): Promise<string> {
  return chat("how'd my day go?", data)
}

export async function formatMorningBrief(data: string): Promise<string> {
  const response = await client.chat.completions.create({
    model: "grok-3-mini-fast",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `It's the start of the workday. Give a quick morning briefing based on this data. Be motivating.\n\n${data}`,
      },
    ],
    temperature: 0.8,
    max_tokens: 400,
  })

  return response.choices[0]?.message?.content || "morning! couldn't pull your data, try asking me directly"
}

export async function formatReminder(data: string): Promise<string> {
  const response = await client.chat.completions.create({
    model: "grok-3-mini-fast",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `Send a quick, friendly reminder about these upcoming tasks. Keep it short.\n\n${data}`,
      },
    ],
    temperature: 0.7,
    max_tokens: 200,
  })

  return response.choices[0]?.message?.content || "heads up — you've got stuff coming up soon"
}
