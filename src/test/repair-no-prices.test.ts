import { readFileSync } from 'fs'
import { join } from 'path'

const root = join(__dirname, '..')

const read = (p: string) => readFileSync(join(root, p), 'utf8')

// Files to check for hidden price information in repair context
const files = {
  jobOrderList: 'pages/JobOrderList.tsx',
  jobOrderDetail: 'pages/JobOrderDetail.tsx',
  vehicleRepairTaskManager: 'components/VehicleRepairTaskManager.tsx',
  reportsDashboard: 'components/ReportsDashboard.tsx'
}

// 1) JobOrderList should not render estimatedCost
{
  const src = read(files.jobOrderList)
  console.assert(!/estimatedCost/.test(src), 'JobOrderList should not reference estimatedCost')
  console.assert(!/Final Cost|Estimated Cost|formatCurrency\(jobOrder\.estimatedCost\)/.test(src), 'JobOrderList should not render currency for job orders')
}

// 2) JobOrderDetail should not render estimated/final cost tiles
{
  const src = read(files.jobOrderDetail)
  console.assert(!/finalCost|estimatedCost/.test(src), 'JobOrderDetail should not reference cost fields in UI')
  console.assert(!/Final Cost|Estimated|formatCurrency\(jobOrder\.finalCost\)|formatCurrency\(jobOrder\.estimatedCost\)/.test(src), 'JobOrderDetail should not display costs')
}

// 3) VehicleRepairTaskManager should not display task costs or spec totalCost
{
  const src = read(files.vehicleRepairTaskManager)
  console.assert(!/estimatedCost|actualCost|totalCost\./.test(src), 'VehicleRepairTaskManager should not reference cost fields in UI')
  console.assert(!/\$|formatCurrency\(/.test(src), 'VehicleRepairTaskManager should not show currency')
}

// 4) ReportsDashboard jobs export should omit Estimated/Final Cost columns
{
  const src = read(files.reportsDashboard)
  console.assert(!/'Estimated Cost'|'Final Cost'|formatCurrency\(job\.finalCost\)|formatCurrency\(job\.estimatedCost\)/.test(src), 'ReportsDashboard jobs export should exclude cost columns')
}

console.log('Repair price visibility tests passed')
