import { useLangStore } from '../stores/langStore'

export const attachCurrencyLogging = () => {
  let prevCurrency = useLangStore.getState().currency
  const unsub = useLangStore.subscribe((state) => {
    if (state.currency !== prevCurrency) {
      console.log('[currency] change', { from: prevCurrency, to: state.currency, at: new Date().toISOString() })
      prevCurrency = state.currency
    }
  })
  return unsub
}

export const logNavigation = (path: string) => {
  const { currency } = useLangStore.getState()
  console.log('[nav] path', { path, currency, at: new Date().toISOString() })
}

