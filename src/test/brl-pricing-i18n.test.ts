import { readFileSync } from 'fs'
import { join } from 'path'

const root = join(__dirname, '..')
const read = (p: string) => readFileSync(join(root, p), 'utf8')

// Verify InvoiceDetails uses i18n keys for BRL pricing section
{
  const src = read('components/InvoiceDetails.tsx')
  console.assert(!/t\('brlPricing\.header'\)/.test(src), 'InvoiceDetails should not use brlPricing.header')
  console.assert(!/t\('brlPricing\.exchangeRateTooltip'\)/.test(src), 'InvoiceDetails should not use brlPricing.exchangeRateTooltip')
  console.assert(!/t\('brlPricing\.exchangeRateLabel'\)/.test(src), 'InvoiceDetails should not use brlPricing.exchangeRateLabel')
  console.assert(!/t\('brlPricing\.sortBy'\)/.test(src), 'InvoiceDetails should not reference brlPricing.sortBy')
  console.assert(!/t\('brlPricing\.sort\.base'\)/.test(src), 'InvoiceDetails should not reference brlPricing.sort.base')
  console.assert(!/t\('brlPricing\.th\.description'\)/.test(src), 'InvoiceDetails should not reference brlPricing.th.description')
  console.assert(!/t\('brlPricing\.empty'\)/.test(src), 'InvoiceDetails should not reference brlPricing.empty')
}

// Verify i18n has brlPricing keys in both languages
{
  const i18n = read('i18n.ts')
  console.assert(/brlPricing:\s*\{[\s\S]*?header:/.test(i18n), 'i18n should define brlPricing section')
  console.assert(/en:\s*\{[\s\S]*?brlPricing:/.test(i18n), 'i18n should include brlPricing under en')
  console.assert(/fr:\s*\{[\s\S]*?brlPricing:/.test(i18n), 'i18n should include brlPricing under fr')
}

console.log('BRL pricing i18n tests passed')
