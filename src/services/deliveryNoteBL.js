/**
 * Delivery Note Business Logic (BL)
 *
 * Clear separation of concerns for transforming job order data into delivery notes,
 * performing pricing calculations, validation, and conversion to invoices.
 *
 * All functions are pure and testable. Pass a logger function for debugging/monitoring.
 */

const defaultLogger = {
  info: (...args) => console.log('[BL:INFO]', ...args),
  warn: (...args) => console.warn('[BL:WARN]', ...args),
  error: (...args) => console.error('[BL:ERROR]', ...args)
}

/**
 * Validate delivery note input payloads
 * @param {object} data - DeliveryNoteFormData { jobOrderId, customerId, expectedDeliveryDate?, deliveryAddress?, deliveryContact? }
 * @param {object} jobOrderData - Job order snapshot containing { customerName, vehicleInfo, partsUsed?, laborItems? }
 * @returns {{ valid: boolean, errors: string[] }} validation result
 * @example
 * validateDeliveryNoteInput({ jobOrderId: 'job_1', customerId: '1' }, { customerName: 'John', vehicleInfo: {} })
 */
function validateDeliveryNoteInput(data, jobOrderData) {
  const errors = []
  if (!data || typeof data !== 'object') {
    errors.push('Invalid form data')
    return { valid: false, errors }
  }
  if (!jobOrderData || typeof jobOrderData !== 'object') {
    errors.push('Invalid job order data')
    return { valid: false, errors }
  }
  
  if (!data.jobOrderId) errors.push('jobOrderId is required')
  if (!data.customerId) errors.push('customerId is required')
  
  if (!jobOrderData.customerName) errors.push('customerName missing from jobOrderData')
  if (!jobOrderData.vehicleInfo) errors.push('vehicleInfo missing from jobOrderData')
  
  if (data.expectedDeliveryDate && isNaN(Date.parse(data.expectedDeliveryDate))) {
    errors.push('Invalid expectedDeliveryDate format')
  }

  // Validate items if present
  if (jobOrderData.partsUsed && Array.isArray(jobOrderData.partsUsed)) {
    jobOrderData.partsUsed.forEach((part, index) => {
      if (!part.name) errors.push(`Part at index ${index} is missing a name`)
      if (part.quantity !== undefined && (isNaN(Number(part.quantity)) || Number(part.quantity) <= 0)) {
        errors.push(`Part "${part.name || index}" must have a positive quantity`)
      }
    })
  }

  if (jobOrderData.laborItems && Array.isArray(jobOrderData.laborItems)) {
    jobOrderData.laborItems.forEach((labor, index) => {
      if (!labor.description) errors.push(`Labor item at index ${index} is missing a description`)
      if (labor.hours !== undefined && (isNaN(Number(labor.hours)) || Number(labor.hours) < 0)) {
        errors.push(`Labor "${labor.description || index}" cannot have negative hours`)
      }
    })
  }

  return { valid: errors.length === 0, errors }
}

/**
 * Transform job order parts to delivery note parts with pricing
 * @param {Array} partsUsed - jobOrder.partsUsed
 * @param {{info?:Function}} logger - optional logger
 * @returns {Array} delivery note parts array
 */
function computePartsFromJobOrder(partsUsed = [], logger = defaultLogger) {
  if (!Array.isArray(partsUsed)) return []
  const parts = partsUsed.map((part) => {
    const qty = Number(part.quantity || 0)
    const unitCost = Number(part.unitCost || part.unitPrice || 0)
    const unitPrice = Number(part.unitPrice || part.unitCost || 0)
    const totalCost = qty * unitCost
    const totalPrice = qty * unitPrice
    return {
      id: part.id,
      partId: part.partNumber,
      partNumber: part.partNumber,
      name: part.name,
      description: part.description,
      quantity: qty,
      unitCost,
      unitPrice,
      totalCost,
      totalPrice,
      supplier: part.supplier,
      location: part.location,
      warrantyInfo: part.warrantyInfo,
      notes: part.notes,
      isWarranty: !!part.isWarranty
    }
  })
  logger.info('computePartsFromJobOrder', { count: parts.length })
  return parts
}

/**
 * Transform job order labor items to delivery note labor with totals
 * @param {Array} laborItems - jobOrder.laborItems
 * @param {{info?:Function}} logger - optional logger
 * @returns {Array} delivery note labor array
 */
function computeLaborFromJobOrder(laborItems = [], logger = defaultLogger) {
  if (!Array.isArray(laborItems)) return []
  const labor = laborItems.map((l) => {
    const hours = Number(l.hours || 0)
    const hourlyRate = Number(l.rate || l.hourlyRate || 0)
    const totalAmount = hours * hourlyRate
    return {
      id: l.id,
      description: l.description,
      hours,
      hourlyRate,
      totalAmount,
      technician: l.mechanic || l.technician,
      notes: l.notes
    }
  })
  logger.info('computeLaborFromJobOrder', { count: labor.length })
  return labor
}

/**
 * Calculate subtotal, tax and total values for a delivery note
 * @param {Array} parts - delivery note parts
 * @param {Array} laborItems - delivery note labor items
 * @param {number} taxRate - tax rate (e.g., 0.2)
 * @returns {{ subtotal: number, taxAmount: number, totalValue: number, totalPartsValue: number, totalLaborValue: number }}
 */
function calculateTotals(parts = [], laborItems = [], taxRate = 0.2) {
  const totalPartsValue = (parts || []).reduce((sum, p) => sum + Number(p.totalPrice || 0), 0)
  const totalLaborValue = (laborItems || []).reduce((sum, l) => sum + Number(l.totalAmount || 0), 0)
  const subtotal = totalPartsValue + totalLaborValue
  const taxAmount = subtotal * Number(taxRate || 0)
  const totalValue = subtotal + taxAmount
  return { subtotal, taxAmount, totalValue, totalPartsValue, totalLaborValue }
}

/**
 * Update part quantity and recompute totals
 * @param {Array} parts - current parts
 * @param {string} partId - target part id (part.partId)
 * @param {number} quantity - new quantity (>=1)
 * @returns {{ ok: boolean, parts?: Array, error?: string, totals?: object }}
 */
function updatePartQuantityBL(parts = [], partId, quantity) {
  if (!partId) return { ok: false, error: 'partId required' }
  const qty = Number(quantity)
  if (!Number.isFinite(qty) || qty <= 0) return { ok: false, error: 'quantity must be positive' }
  const updated = (parts || []).map(p => p.partId === partId
    ? { ...p, quantity: qty, totalCost: qty * Number(p.unitCost || 0), totalPrice: qty * Number(p.unitPrice || 0) }
    : p)
  const totals = calculateTotals(updated, [])
  return { ok: true, parts: updated, totals }
}

/**
 * Update part unit price and recompute totals
 * @param {Array} parts - current parts
 * @param {string} partId - target part id
 * @param {number} unitPrice - new unit price (>=0)
 * @returns {{ ok: boolean, parts?: Array, error?: string, totals?: object }}
 */
function updatePartPricingBL(parts = [], partId, unitPrice) {
  if (!partId) return { ok: false, error: 'partId required' }
  const price = Number(unitPrice)
  if (!Number.isFinite(price) || price < 0) return { ok: false, error: 'unitPrice must be non-negative' }
  const updated = (parts || []).map(p => p.partId === partId
    ? { ...p, unitPrice: price, totalPrice: Number(p.quantity || 0) * price }
    : p)
  const totals = calculateTotals(updated, [])
  return { ok: true, parts: updated, totals }
}

/**
 * Convert a delivery note snapshot into an invoice payload
 * @param {object} note - delivery note snapshot
 * @param {{ taxRate?: number, paymentTerms?: string, dueDate?: string }} options
 * @returns {{ items: Array, subtotal: number, taxAmount: number, totalAmount: number, notes?: string }}
 * @example
 * convertDeliveryNoteToInvoice({ parts:[...], laborItems:[...] }, { taxRate: 0.2 })
 */
function convertDeliveryNoteToInvoiceBL(note, options = {}) {
  const taxRate = Number(options.taxRate ?? 0.2)
  const items = []
  ;(note.parts || []).forEach(part => {
    items.push({
      id: part.id,
      type: 'part',
      description: part.name,
      quantity: part.quantity,
      unitPrice: part.unitPrice,
      totalPrice: part.totalPrice,
      partNumber: part.partNumber,
      taxRate
    })
  })
  ;(note.laborItems || []).forEach(labor => {
    items.push({
      id: labor.id,
      type: 'labor',
      description: labor.description,
      quantity: labor.hours,
      unitPrice: labor.hourlyRate,
      totalPrice: labor.totalAmount,
      laborHours: labor.hours,
      hourlyRate: labor.hourlyRate,
      taxRate
    })
  })
  const totals = calculateTotals(note.parts || [], note.laborItems || [], taxRate)
  return {
    items,
    subtotal: totals.subtotal,
    taxAmount: totals.taxAmount,
    totalAmount: totals.totalValue,
    notes: options.paymentTerms ? `Payment Terms: ${options.paymentTerms}` : undefined
  }
}

export {
  validateDeliveryNoteInput,
  computePartsFromJobOrder,
  computeLaborFromJobOrder,
  calculateTotals,
  updatePartQuantityBL,
  updatePartPricingBL,
  convertDeliveryNoteToInvoiceBL,
}
