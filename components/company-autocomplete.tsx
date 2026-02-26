"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Building2, Search } from "lucide-react"

type AccountSuggestion = {
  name: string
  industry?: string | null
  location?: string | null
  prospects: number
}

type CompanyAutocompleteProps = {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  id?: string
}

export function CompanyAutocomplete({
  value,
  onChange,
  placeholder = "Acme Corp",
  disabled = false,
  id,
}: CompanyAutocompleteProps) {
  const router = useRouter()
  const [suggestions, setSuggestions] = useState<AccountSuggestion[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const containerRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  const fetchSuggestions = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSuggestions([])
      return
    }

    try {
      const res = await fetch(`/api/accounts?search=${encodeURIComponent(query)}`)
      if (!res.ok) return
      const data = await res.json()
      const accounts = (data.accounts || []).slice(0, 8).map((a: any) => ({
        name: a.name,
        industry: a.industry,
        location: a.location,
        prospects: a.contacts || a._count?.prospects || 0,
      }))
      setSuggestions(accounts)
      setShowDropdown(accounts.length > 0)
      setHighlightedIndex(-1)
    } catch {
      // silently fail
    }
  }, [])

  const handleInputChange = (newValue: string) => {
    onChange(newValue)

    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      fetchSuggestions(newValue)
    }, 300)
  }

  const selectSuggestion = (name: string) => {
    onChange(name)
    setShowDropdown(false)
    setSuggestions([])
  }

  const handleFindLeads = (e: React.MouseEvent, account: AccountSuggestion) => {
    e.preventDefault()
    e.stopPropagation()
    setShowDropdown(false)

    const params = new URLSearchParams({
      tab: "leads",
      company: account.name,
      autoSearch: "true",
    })

    router.push(`/prospecting/outbound?${params.toString()}`)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown || suggestions.length === 0) return

    if (e.key === "ArrowDown") {
      e.preventDefault()
      setHighlightedIndex((prev) => Math.min(prev + 1, suggestions.length - 1))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setHighlightedIndex((prev) => Math.max(prev - 1, 0))
    } else if (e.key === "Enter" && highlightedIndex >= 0) {
      e.preventDefault()
      selectSuggestion(suggestions[highlightedIndex].name)
    } else if (e.key === "Escape") {
      setShowDropdown(false)
    }
  }

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  return (
    <div ref={containerRef} className="relative">
      <Input
        id={id}
        value={value}
        onChange={(e) => handleInputChange(e.target.value)}
        onFocus={() => {
          if (suggestions.length > 0) setShowDropdown(true)
        }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete="off"
      />
      {showDropdown && suggestions.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md">
          <ul className="max-h-[240px] overflow-y-auto py-1">
            {suggestions.map((s, i) => (
              <li
                key={s.name}
                className={`flex items-center gap-2 cursor-pointer px-3 py-2 text-sm ${
                  i === highlightedIndex ? "bg-accent text-accent-foreground" : "hover:bg-accent/50"
                }`}
                onMouseDown={(e) => {
                  e.preventDefault()
                  selectSuggestion(s.name)
                }}
                onMouseEnter={() => setHighlightedIndex(i)}
              >
                <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="truncate font-medium">{s.name}</span>
                  {(s.industry || s.location) && (
                    <span className="text-xs text-muted-foreground truncate">
                      {[s.industry, s.location].filter(Boolean).join(" · ")}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  className="ml-auto shrink-0 flex items-center gap-1 text-xs text-primary hover:text-primary/80 font-medium px-2 py-1 rounded hover:bg-primary/10 transition-colors"
                  onMouseDown={(e) => handleFindLeads(e, s)}
                >
                  <Search className="h-3 w-3" />
                  Find Leads
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
