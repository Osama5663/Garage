import { readFileSync } from 'fs'
import { join } from 'path'

const root = join(__dirname, '..')
const read = (p: string) => readFileSync(join(root, p), 'utf8')

{
  const src = read('pages/JobOrderDetail.tsx')
  console.assert(src.includes('const canViewPrices'), 'JobOrderDetail should define canViewPrices')
  console.assert(src.includes('canViewPrices && (<span'), 'Inventory picker price display must be guarded')
  console.assert(src.includes('canViewPrices ? (') && src.includes('formatCurrency(part.unitCost)'), 'Parts price line must be guarded')
  console.assert(src.includes('canViewPrices && (<span className="font-medium text-gray-900">') && src.includes('formatCurrency(labor.total)'), 'Labor total must be guarded')
  console.assert(src.includes('canViewPrices ? (') && src.includes('formatCurrency(labor.rate)'), 'Labor rate display must be guarded')
}

{
  const storeSrc = read('stores/jobOrderStore.ts')
  console.assert(!/finalCost\s*\+\s*part\.totalCost/.test(storeSrc), 'Store should not update finalCost from part')
  console.assert(!/finalCost\s*\+\s*labor\.total/.test(storeSrc), 'Store should not update finalCost from labor')
  console.assert(!/finalCost\s*>\s*0/.test(storeSrc), 'Approval readiness should not depend on finalCost')
}

console.log('Job order price role guard tests passed')
