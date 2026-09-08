import { create } from 'zustand'
import { useEffect } from 'react'

interface TimeState {
  now: Date
  timeZone: string
  locale: string
  lastSync: number
  error: string | null
  setStateFromSystem: () => void
}

export const detectSystemTime = () => {
  const now = new Date()
  let timeZone = 'UTC'
  let locale = 'en-US'
  let error: string | null = null

  try {
    if (typeof Intl !== 'undefined' && typeof Intl.DateTimeFormat === 'function') {
      const options = Intl.DateTimeFormat().resolvedOptions()
      if (options.timeZone) {
        timeZone = options.timeZone
      }
      if ((options as any).locale) {
        locale = (options as any).locale
      }
    }
    if (typeof navigator !== 'undefined' && navigator.language) {
      locale = navigator.language
    }
  } catch {
    error = 'TIME_ACCESS_RESTRICTED'
  }

  return { now, timeZone, locale, error }
}

export const useTimeStore = create<TimeState>((set) => {
  const initial = detectSystemTime()
  return {
    now: initial.now,
    timeZone: initial.timeZone,
    locale: initial.locale,
    lastSync: Date.now(),
    error: initial.error,
    setStateFromSystem: () => {
      const detected = detectSystemTime()
      set({
        now: detected.now,
        timeZone: detected.timeZone,
        locale: detected.locale,
        lastSync: Date.now(),
        error: detected.error
      })
    }
  }
})

export const useSystemTime = (intervalMs = 1000) => {
  const now = useTimeStore((s) => s.now)
  const timeZone = useTimeStore((s) => s.timeZone)
  const locale = useTimeStore((s) => s.locale)
  const error = useTimeStore((s) => s.error)
  const setStateFromSystem = useTimeStore((s) => s.setStateFromSystem)

  useEffect(() => {
    setStateFromSystem()

    const tick = () => {
      setStateFromSystem()
    }

    const id = window.setInterval(tick, intervalMs)

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        setStateFromSystem()
      }
    }

    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [intervalMs, setStateFromSystem])

  return { now, timeZone, locale, error }
}
