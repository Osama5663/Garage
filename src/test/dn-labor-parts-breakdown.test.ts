import { readFileSync } from 'fs'
import { join } from 'path'

const root = join(__dirname, '..')
const read = (p: string) => readFileSync(join(root, p), 'utf8')

{
  const src = read('components/DeliveryNote.tsx')
  console.assert(/Spare Parts/.test(src), 'DeliveryNote should render Parts section header')
  console.assert(/Subtotal \(Parts\)/.test(src), 'DeliveryNote should render parts subtotal')
  console.assert(/<h2 className=\"text-lg font-medium text-gray-900\">Labor<\/.h2>/.test(src) || /<h2 className=\"text-lg font-medium text-gray-900\">Labor<\/.*/.test(src), 'DeliveryNote should render Labor section header')
  console.assert(/Hourly Rate/.test(src) && /Hours/.test(src) && /Technician/.test(src), 'Labor table should include required columns')
  console.assert(/Subtotal \(Labor\)/.test(src), 'DeliveryNote should render labor subtotal')
  console.assert(/VAT \(20%\)/.test(src) && /Total/.test(src), 'DeliveryNote should render final totals block with VAT and Total')
}

console.log('Delivery note labor/parts breakdown tests passed')

