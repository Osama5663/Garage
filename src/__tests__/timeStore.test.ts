import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useSystemTime, detectSystemTime } from '../stores/timeStore'

describe('timeStore system time behavior', () => {
  const originalDateNow = Date.now
  const originalResolvedOptions = Intl.DateTimeFormat.prototype.resolvedOptions
  const originalNavigator = global.navigator

  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    Date.now = originalDateNow
    Intl.DateTimeFormat.prototype.resolvedOptions = originalResolvedOptions
    Object.defineProperty(global, 'navigator', { value: originalNavigator, configurable: true })
  })

  it('detects system timezone and locale from Intl and navigator', () => {
    const fakeTz = 'Europe/Paris'
    const fakeLocale = 'fr-FR'

    Intl.DateTimeFormat.prototype.resolvedOptions = vi.fn(() => ({
      timeZone: fakeTz,
      locale: fakeLocale,
      calendar: 'gregory',
      numberingSystem: 'latn'
    })) as unknown as () => Intl.ResolvedDateTimeFormatOptions

    Object.defineProperty(global, 'navigator', {
      value: { language: fakeLocale },
      configurable: true
    })

    const detected = detectSystemTime()

    expect(detected.timeZone).toBe(fakeTz)
    expect(detected.locale).toBe(fakeLocale)
  })

  it('updates time on interval ticks', () => {
    const start = new Date('2024-01-01T10:00:00.000Z')
    let current = start.getTime()

    Date.now = vi.fn(() => current)

    Intl.DateTimeFormat.prototype.resolvedOptions = vi.fn(() => ({
      timeZone: 'UTC',
      locale: 'en-US',
      calendar: 'gregory',
      numberingSystem: 'latn'
    })) as unknown as () => Intl.ResolvedDateTimeFormatOptions

    Object.defineProperty(global, 'navigator', {
      value: { language: 'en-US' },
      configurable: true
    })

    const { result } = renderHook(() => useSystemTime(1000))

    const initialNow = result.current.now

    act(() => {
      current += 5000
      vi.advanceTimersByTime(5000)
    })

    const updatedNow = result.current.now

    expect(updatedNow.getTime()).toBeGreaterThan(initialNow.getTime())
  })

  it('sets error flag when Intl access throws', () => {
    Intl.DateTimeFormat.prototype.resolvedOptions = vi.fn(() => {
      throw new Error('blocked')
    }) as unknown as () => Intl.ResolvedDateTimeFormatOptions

    Object.defineProperty(global, 'navigator', {
      value: { language: 'en-US' },
      configurable: true
    })

    const detected = detectSystemTime()

    expect(detected.error).toBe('TIME_ACCESS_RESTRICTED')
  })
})
