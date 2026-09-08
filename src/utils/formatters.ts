import { useLangStore } from '../stores/langStore'
import { convertAmount } from './exchangeRates'

export const formatCurrency = (amount: number): string => {
  const { locale, currency } = useLangStore.getState()
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount)
}

export const formatCurrencyFrom = (amount: number, fromCurrency: string): string => {
  const { currency } = useLangStore.getState()
  const converted = convertAmount(amount, fromCurrency, currency)
  return formatCurrency(converted)
}

export const formatDate = (dateString: string): string => {
  const { locale } = useLangStore.getState()
  return new Date(dateString).toLocaleDateString(locale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  })
}

export const formatDateTime = (dateString: string): string => {
  const { locale } = useLangStore.getState()
  return new Date(dateString).toLocaleDateString(locale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}
