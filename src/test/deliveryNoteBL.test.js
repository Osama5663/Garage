const assert = console.assert
const BL = require('../services/deliveryNoteBL.js')

// 1) Validation
{
  const res = BL.validateDeliveryNoteInput({ jobOrderId: 'job_1', customerId: '1' }, { customerName: 'John', vehicleInfo: {} })
  assert(res.valid, 'Validation should pass for minimal valid data')
  const bad = BL.validateDeliveryNoteInput({}, {})
  assert(!bad.valid && bad.errors.length > 0, 'Validation should fail for empty data')
}

// 2) Parts transform and totals
{
  const parts = BL.computePartsFromJobOrder([
    { id: 'p1', partNumber: 'OF-123', name: 'Oil Filter', description: 'Premium', quantity: 2, unitCost: 10, unitPrice: 15 },
    { id: 'p2', partNumber: 'AF-9012', name: 'Air Filter', description: 'OEM', quantity: 1, unitCost: 20, unitPrice: 25 },
  ])
  assert(parts.length === 2, 'computePartsFromJobOrder should map all parts')
  const totals = BL.calculateTotals(parts, [])
  assert(Math.abs(totals.totalPartsValue - (2 * 15 + 1 * 25)) < 1e-6, 'Parts subtotal should match extended totals')
}

// 3) Labor transform and totals
{
  const labor = BL.computeLaborFromJobOrder([
    { id: 'l1', description: 'Oil change', hours: 1.5, rate: 80 },
    { id: 'l2', description: 'Inspection', hours: 0.5, rate: 60 },
  ])
  const totals = BL.calculateTotals([], labor)
  assert(Math.abs(totals.totalLaborValue - (1.5 * 80 + 0.5 * 60)) < 1e-6, 'Labor subtotal should match totals')
}

// 4) Update part quantity and pricing
{
  const parts = BL.computePartsFromJobOrder([{ id: 'p1', partNumber: 'OF-123', name: 'Oil Filter', description: '', quantity: 1, unitCost: 10, unitPrice: 15 }])
  const qres = BL.updatePartQuantityBL(parts, 'OF-123', 3)
  assert(qres.ok, 'updatePartQuantityBL should succeed')
  assert(qres.parts.find(p => p.partId === 'OF-123').quantity === 3, 'Quantity should update to 3')
  const pres = BL.updatePartPricingBL(qres.parts, 'OF-123', 20)
  assert(pres.ok, 'updatePartPricingBL should succeed')
  assert(Math.abs(pres.parts.find(p => p.partId === 'OF-123').totalPrice - 60) < 1e-6, 'Total price should recalc to 60')
}

// 5) Convert to invoice payload
{
  const parts = BL.computePartsFromJobOrder([{ id: 'p1', partNumber: 'OF-123', name: 'Oil Filter', description: '', quantity: 2, unitPrice: 15 }])
  const labor = BL.computeLaborFromJobOrder([{ id: 'l1', description: 'Oil change', hours: 1.5, rate: 80 }])
  const note = { parts, laborItems: labor }
  const inv = BL.convertDeliveryNoteToInvoiceBL(note, { taxRate: 0.2, paymentTerms: 'Net 30' })
  assert(inv.items.length === 2, 'Invoice should include both part and labor items')
  assert(inv.subtotal > 0 && inv.totalAmount > inv.subtotal, 'Totals should include tax')
}

console.log('deliveryNoteBL tests passed')

