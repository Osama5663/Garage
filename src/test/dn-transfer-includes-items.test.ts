import { readFileSync } from 'fs'
import { join } from 'path'

const root = join(__dirname, '..')
const read = (p: string) => readFileSync(join(root, p), 'utf8')

{
  const src = read('pages/JobOrderDetail.tsx')
  console.assert(/createDeliveryNote\([\s\S]*partsUsed:\s*jobOrder\.partsUsed/.test(src), 'Approval flow should pass partsUsed to createDeliveryNote')
  console.assert(/createDeliveryNote\([\s\S]*laborItems:\s*jobOrder\.laborItems/.test(src), 'Approval flow should pass laborItems to createDeliveryNote')
}

console.log('Delivery note transfer includes items tests passed')

