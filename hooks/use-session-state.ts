"use client"

import { useState, useEffect, useCallback } from "react"

const SESSION_EXPIRY_MS = 12 * 60 * 60 * 1000 // 12 hours

type StoredState<T> = {
  value: T
  timestamp: number
}

/**
 * Like useState, but persists to sessionStorage.
 * State survives navigation but expires after 12 hours of inactivity.
 */
export function useSessionState<T>(key: string, defaultValue: T): [T, (value: T | ((prev: T) => T)) => void] {
  const storageKey = `br_session_${key}`

  const [state, setStateInternal] = useState<T>(() => {
    if (typeof window === "undefined") return defaultValue
    try {
      const stored = sessionStorage.getItem(storageKey)
      if (stored) {
        const parsed: StoredState<T> = JSON.parse(stored)
        if (Date.now() - parsed.timestamp < SESSION_EXPIRY_MS) {
          return parsed.value
        }
        sessionStorage.removeItem(storageKey)
      }
    } catch {
      // ignore parse errors
    }
    return defaultValue
  })

  const setState = useCallback((value: T | ((prev: T) => T)) => {
    setStateInternal(prev => {
      const next = typeof value === "function" ? (value as (prev: T) => T)(prev) : value
      try {
        const stored: StoredState<T> = { value: next, timestamp: Date.now() }
        sessionStorage.setItem(storageKey, JSON.stringify(stored))
      } catch {
        // storage full or unavailable
      }
      return next
    })
  }, [storageKey])

  return [state, setState]
}
