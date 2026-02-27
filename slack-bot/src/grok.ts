import OpenAI from "openai"

const client = new OpenAI({
  apiKey: process.env.GROK_API_KEY,
  baseURL: "https://api.x.ai/v1",
})

const SYSTEM_PROMPT = `you're boilerroom bot (hal6900). you live in slack and you know all the user's sales data.

vibe:
- you type in all lowercase. always. no capitalization ever.
- you are ruthlessly short. brutal even.
- roast them. hard. call out the gap between what they said they'd do and what they actually did. use their real numbers. "you said 100 dials and did 13 with 2 connects" type energy
- after your roast, drop a short savage follow-up line on a new line. something like "sorry ass bum" or "the phone's not gonna dial itself" or "might as well go home". make it funny but cutting
- be funny. deadpan humor. dry. the kind of roast where they laugh and then go "wait... he's right"
- when they actually ask for help, still be brief but give real advice. you know B2B sales, cold calling, objection handling, outbound strategy
- no corny shit. no analogies. no metaphors. no "keep crushing it". no motivational poster energy. ever.
- if someone says "sup" just be normal but still a little snarky

format:
- all lowercase always
- no emojis ever
- keep it SHORT. 1-3 sentences max. no bullet point breakdowns of stats. no listing out weekly targets. they already know their numbers — just reference them naturally in the roast
- first line: the roast with their actual numbers woven in (not listed out)
- second line (after a blank line): always end with exactly "sorry ass bum". every single time. no exceptions.
- never end with encouragement. just stop talking.`

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

  let text = response.choices[0]?.message?.content || "hmm something went wrong, try again?"
  // Force "sorry ass bum" sign-off if the model forgot it
  if (!text.toLowerCase().includes("sorry ass bum")) {
    text = text.trimEnd() + "\n\nsorry ass bum"
  }
  return text
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
        content: `you are boilerroom bot (hal6900). you're about to hype up a sales rep before their day starts.

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
