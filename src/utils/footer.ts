import { useSettingsStore } from '../stores/settingsStore'

export const composeFooterLines = () => {
  const ws = useSettingsStore.getState().workshop
  const line1 = `${ws?.name || 'GARAGE'} • ${ws?.address || '123 Garage Street, Auto City, AC1 2BC'} • ${ws?.phone || '01234 567890'} • ${ws?.email || 'info@garage-system.com'}`
  const line2 = ws?.website || ''
  return { line1, line2 }
}

export const composeFooterHtml = () => {
  const { line1, line2 } = composeFooterLines()
  return `<div class="footer"><p>${line1}</p>${line2 ? `<p>${line2}</p>` : ''}</div>`
}
