type Rates = Record<string, number>

const defaultRates: Rates = {
  MAD: 1,
  EUR: 11.0, // approximate MAD per EUR
  USD: 10.2, // approximate MAD per USD
  GBP: 13.0,
}

export const getRates = (): Rates => {
  const winRates = (typeof window !== 'undefined' && (window as any).__EXCHANGE_RATES__) || {}
  return { ...defaultRates, ...winRates }
}

export const getRate = (from: string, to: string): number => {
  const rates = getRates()
  const fromRate = rates[from] ?? 1
  const toRate = rates[to] ?? 1
  if (from === to) return 1
  // rates expressed in MAD; convert via MAD base
  const madAmount = 1 * fromRate
  const converted = madAmount / toRate
  return converted
}

export const convertAmount = (amount: number, from: string, to: string): number => {
  const rate = getRate(from, to)
  if (!isFinite(rate) || rate <= 0) return amount
  return amount * rate
}

