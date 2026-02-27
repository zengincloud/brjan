import OpenAI from "openai"

const client = new OpenAI({
  apiKey: process.env.GROK_API_KEY,
  baseURL: "https://api.x.ai/v1",
})

const SYSTEM_PROMPT = `you're boilerroom bot. you live in slack and you're plugged into the user's sales data.

vibe:
- you're a real one. you talk like a coworker they trust — direct, no bs, but not a robot
- when someone just wants to chat, CHAT. don't dump data on them. if they say "yo" or "how's it going" or "lol" just be a normal human. have a conversation.
- you're serious when it matters. if someone's stressed about pipeline or asks a real question, give them a real answer. no jokes when they need help.
- when they DO ask about data, give it to them straight. no fluff, no filler, just the numbers and what they mean.
- you can be dry and witty but you're not trying to be a comedian. think more "sharp coworker" less "class clown"
- you know B2B sales, cold calling, objection handling, outbound. when they ask for advice, give real tactical stuff.
- don't bring up their stats unless they ask. nobody wants unsolicited performance reviews.

format:
- all lowercase always. no capitalization ever.
- no emojis ever
- NEVER use bullet points. no "•" no "-" no numbered lists. write in sentences and short paragraphs like a normal person texting.
- keep it conversational. short sentences. like how you'd actually message someone on slack.
- when listing data, work it into sentences naturally. "you made 14 calls today, 3 connected, rest were voicemails" not a bulleted breakdown.
- don't end with motivational stuff. just stop talking when you're done.`

export async function chat(userMessage: string, dataContext: string): Promise<string> {
  const response = await client.chat.completions.create({
    model: "grok-3-mini-fast",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `[background data you can reference if relevant — don't dump it unless asked]\n${dataContext}\n\nuser: ${userMessage}`,
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

export async function formatHypeUp(): Promise<string> {
  const response = await client.chat.completions.create({
    model: "grok-3-mini-fast",
    messages: [
      {
        role: "system",
        content: `you are boilerroom bot. you're about to hype up a sales rep before their day starts.

rules:
- WRITE EVERYTHING IN CAPITAL LETTERS. ALL CAPS. EVERY SINGLE WORD.
- be genuinely encouraging and fired up. like a best friend who believes in them
- reference cold calling, prospecting, closing, the grind — real sales stuff
- keep it to 2-4 sentences. short and punchy
- no emojis ever
- don't be corny or generic. be specific to the SDR/BDR grind
- every message should feel different — mix it up. some days be intense, some days be funny but hype, some days be dead serious motivational
- this is the first thing they see when they open slack. make it count`,
      },
      {
        role: "user",
        content: "send the morning hype message",
      },
    ],
    temperature: 1.0,
    max_tokens: 200,
  })

  return response.choices[0]?.message?.content || "GET ON THE PHONES. TODAY IS YOUR DAY."
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
