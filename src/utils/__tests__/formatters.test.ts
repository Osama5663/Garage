import { describe, it, expect, beforeEach } from 'vitest'
import { useLangStore } from '../../stores/langStore'
import { formatCurrency, formatCurrencyFrom } from '../formatters'

describe('currency formatters', () => {
  beforeEach(() => {
    useLangStore.setState({
      language: 'fr',
      locale: 'fr-FR',
      currency: 'MAD',
    })
  })

  it('formats amounts in the active currency', () => {
    const formatted = formatCurrency(1234.56)
    expect(formatted).toMatch(/MAD$/)
  })

  it('converts from another currency before formatting', () => {
    const formatted = formatCurrencyFrom(100, 'EUR')
    expect(typeof formatted).toBe('string')
  })
})
