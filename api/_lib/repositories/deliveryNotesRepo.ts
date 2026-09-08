import { getMariaPool } from '../config/mariadb.js'
import { getSupplierByIdMaria } from './suppliersRepo.js'
import { getPurchaseOrderByIdMaria } from './purchaseOrdersRepo.js'
import { v4 as uuidv4 } from 'uuid'

const TABLE = 'delivery_notes'

const ensureTable = async () => {
  const pool = await getMariaPool()
  await pool.query(
    `CREATE TABLE IF NOT EXISTS \`${TABLE}\` (
      \`_id\` VARCHAR(255) NOT NULL,
      \`doc\` LONGTEXT NOT NULL,
      PRIMARY KEY (\`_id\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`
  )
}

const parse = (value: any) => {
  try {
    return JSON.parse(String(value))
  } catch {
    return null
  }
}

export const getDeliveryNoteByIdMaria = async (id: string): Promise<any | null> => {
  await ensureTable()
  const pool = await getMariaPool()
  const [rows] = await pool.query(`SELECT \`doc\` FROM \`${TABLE}\` WHERE \`_id\` = ?`, [id])
  const arr = rows as Array<{ doc: string }>
  if (!arr.length) return null
  return parse(arr[0].doc)
}

export const listDeliveryNotesMaria = async (): Promise<any[]> => {
  await ensureTable()
  const pool = await getMariaPool()
  const [rows] = await pool.query(`SELECT \`doc\` FROM \`${TABLE}\``)
  const docs = (rows as Array<{ doc: string }>).map(r => parse(r.doc)).filter(Boolean)
  docs.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
  return docs
}

export const listDeliveryNotesMariaFiltered = async (filters?: {
  supplier_id?: string
  purchase_order_id?: string
  status?: string
  delivery_date_from?: string
  delivery_date_to?: string
  search?: string
}): Promise<any[]> => {
  let docs = await listDeliveryNotesMaria()
  if (filters?.supplier_id) docs = docs.filter(d => String(d.supplier_id || '') === String(filters.supplier_id))
  if (filters?.purchase_order_id) docs = docs.filter(d => String(d.purchase_order_id || '') === String(filters.purchase_order_id))
  if (filters?.status) docs = docs.filter(d => String(d.status || '') === String(filters.status))
  if (filters?.delivery_date_from) {
    const from = new Date(filters.delivery_date_from).getTime()
    docs = docs.filter(d => new Date(d.delivery_date || 0).getTime() >= from)
  }
  if (filters?.delivery_date_to) {
    const to = new Date(filters.delivery_date_to).getTime()
    docs = docs.filter(d => new Date(d.delivery_date || 0).getTime() <= to)
  }
  if (filters?.search) {
    const s = String(filters.search).trim().toLowerCase()
    if (s) {
      docs = docs.filter(d => {
        const hay = `${String(d.delivery_note_number || '')} ${String(d.notes || '')}`.toLowerCase()
        return hay.includes(s)
      })
    }
  }
  return docs
}

export const createDeliveryNoteMaria = async (payload: any): Promise<any> => {
  await ensureTable()
  const pool = await getMariaPool()
  const id = payload?.id ? String(payload.id) : uuidv4()
  const supplier = payload?.supplier_id ? await getSupplierByIdMaria(String(payload.supplier_id)) : null
  const po = payload?.purchase_order_id ? await getPurchaseOrderByIdMaria(String(payload.purchase_order_id)) : null
  const doc = {
    ...payload,
    id,
    suppliers: supplier ? { name: supplier.name } : payload.suppliers,
    supplier: supplier ? { name: supplier.name } : payload.supplier,
    purchase_orders: po ? { po_number: po.po_number } : payload.purchase_orders,
    purchase_order: po ? { po_number: po.po_number } : payload.purchase_order,
    supplier_name: supplier ? supplier.name : payload.supplier_name,
    purchase_order_number: po ? po.po_number : payload.purchase_order_number,
  }
  await pool.query(
    `INSERT INTO \`${TABLE}\` (\`_id\`, \`doc\`) VALUES (?, ?) ON DUPLICATE KEY UPDATE \`doc\`=VALUES(\`doc\`)`,
    [id, JSON.stringify(doc)]
  )
  return doc
}

export const updateDeliveryNoteMaria = async (id: string, payload: any): Promise<any> => {
  await ensureTable()
  const pool = await getMariaPool()
  const supplier = payload?.supplier_id ? await getSupplierByIdMaria(String(payload.supplier_id)) : null
  const po = payload?.purchase_order_id ? await getPurchaseOrderByIdMaria(String(payload.purchase_order_id)) : null
  const doc = {
    ...payload,
    id,
    suppliers: supplier ? { name: supplier.name } : payload.suppliers,
    supplier: supplier ? { name: supplier.name } : payload.supplier,
    purchase_orders: po ? { po_number: po.po_number } : payload.purchase_orders,
    purchase_order: po ? { po_number: po.po_number } : payload.purchase_order,
    supplier_name: supplier ? supplier.name : payload.supplier_name,
    purchase_order_number: po ? po.po_number : payload.purchase_order_number,
  }
  await pool.query(
    `INSERT INTO \`${TABLE}\` (\`_id\`, \`doc\`) VALUES (?, ?) ON DUPLICATE KEY UPDATE \`doc\`=VALUES(\`doc\`)`,
    [id, JSON.stringify(doc)]
  )
  return doc
}

export const deleteDeliveryNoteMaria = async (id: string): Promise<boolean> => {
  await ensureTable()
  const pool = await getMariaPool()
  const [res] = await pool.query(`DELETE FROM \`${TABLE}\` WHERE \`_id\` = ?`, [id])
  const info = res as any
  return !!(info.affectedRows > 0)
}

export const setDeliveryNotesInvoiceMaria = async (deliveryNoteIds: string[], invoiceId: string | null) => {
  for (const id of deliveryNoteIds) {
    const dn = await getDeliveryNoteByIdMaria(id)
    if (!dn) continue
    const updated = {
      ...dn,
      status: invoiceId ? 'invoiced' : (dn.status === 'invoiced' ? 'validated' : dn.status),
      invoice_id: invoiceId || undefined,
      updated_at: new Date().toISOString(),
    }
    await updateDeliveryNoteMaria(id, updated)
  }
}
