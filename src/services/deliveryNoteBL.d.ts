export function validateDeliveryNoteInput(
  data: any,
  jobOrderData: any
): { valid: boolean; errors: string[] }

export function computePartsFromJobOrder(partsUsed?: any[], logger?: any): any[]
export function computeLaborFromJobOrder(laborItems?: any[], logger?: any): any[]

export function calculateTotals(
  parts?: any[],
  laborItems?: any[],
  taxRate?: number
): { subtotal: number; taxAmount: number; totalValue: number; totalPartsValue: number; totalLaborValue: number }

export function updatePartQuantityBL(
  parts: any[],
  partId: string,
  quantity: number
): { ok: boolean; parts?: any[]; error?: string; totals?: any }

export function updatePartPricingBL(
  parts: any[],
  partId: string,
  unitPrice: number
): { ok: boolean; parts?: any[]; error?: string; totals?: any }

export function convertDeliveryNoteToInvoiceBL(
  note: any,
  options?: { taxRate?: number; paymentTerms?: string; dueDate?: string }
): { items: any[]; subtotal: number; taxAmount: number; totalAmount: number; notes?: string }

