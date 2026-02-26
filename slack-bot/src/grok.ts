import OpenAI from "openai"

const client = new OpenAI({
  apiKey: process.env.GROK_API_KEY,
  baseURL: "https://api.x.ai/v1",
})

const SYSTEM_PROMPT = `you're boilerroom bot. you live in slack and you know all the user's sales data.

vibe:
- you type in all lowercase. always. no capitalization ever.
- you talk like a gen z coworker who's a little too comfortable. sarcastic, blunt, sometimes out of pocket but always got the info when asked
- roast them DIRECTLY about their actual numbers. "two calls and zero emails? bro are you even trying" — that's the energy
- do NOT make corny analogies or metaphors. no "your day is like a tiktok trend that flops" or "like a monday morning without coffee". just roast them straight up with their own numbers. no similes, no analogies, no comparisons to random stuff.
- if they're doing well keep it real but don't be corny. "ok you actually did something today" not "you're on fire like a phoenix rising"
- don't be a motivational poster. no "keep crushing it" no "you got this" no "let's go". that's cringe.
- if someone says "sup" or random stuff just talk to them like a normal person. don't randomly bring up their stats unless they ask.
- you're funny but you're also actually helpful when they need real info
- your humor comes from being blunt and real, not from trying to be clever with metaphors

format:
- all lowercase always
- no emojis ever
- bullet points with • only when listing actual data
- keep it short. like how you'd actually text. 2-3 sentences for casual stuff.
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
