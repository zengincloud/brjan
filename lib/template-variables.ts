type ProspectData = {
  name: string
  email?: string | null
  company?: string | null
  title?: string | null
  phone?: string | null
}

/**
 * Replace email template variables like {{name}}, {{firstName}}, {{company}}
 * with actual prospect data. Case-insensitive matching.
 */
export function replaceEmailVariables(text: string, prospect: ProspectData): string {
  if (!text || !prospect) return text

  const firstName = prospect.name?.split(" ")[0] || ""
  const lastName = prospect.name?.split(" ").slice(1).join(" ") || ""

  return text
    .replace(/\{\{name\}\}/gi, prospect.name || "")
    .replace(/\{\{firstName\}\}/gi, firstName)
    .replace(/\{\{first_name\}\}/gi, firstName)
    .replace(/\{\{lastName\}\}/gi, lastName)
    .replace(/\{\{last_name\}\}/gi, lastName)
    .replace(/\{\{email\}\}/gi, prospect.email || "")
    .replace(/\{\{company\}\}/gi, prospect.company || "")
    .replace(/\{\{title\}\}/gi, prospect.title || "")
    .replace(/\{\{phone\}\}/gi, prospect.phone || "")
}

/** Available template variables for UI display */
export const TEMPLATE_VARIABLES = [
  { label: "First Name", variable: "{{firstName}}" },
  { label: "Last Name", variable: "{{lastName}}" },
  { label: "Full Name", variable: "{{name}}" },
  { label: "Company", variable: "{{company}}" },
  { label: "Title", variable: "{{title}}" },
  { label: "Email", variable: "{{email}}" },
  { label: "Phone", variable: "{{phone}}" },
] as const
