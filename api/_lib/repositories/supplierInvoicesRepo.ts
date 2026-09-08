import { getMariaPool } from '../config/mariadb.js'
import { v4 as uuidv4 } from 'uuid'
import { getSupplierByIdMaria } from './suppliersRepo.js'
import { getPurchaseOrderByIdMaria } from './purchaseOrdersRepo.js'
import { getDeliveryNoteByIdMaria, setDeliveryNotesInvoiceMaria } from './deliveryNotesRepo.js'
import { getInventoryItemByIdMaria } from './inventoryRepo.js'

const TABLE = 'supplier_invoices'

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

export const getSupplierInvoiceByIdMaria = async (id: string): Promise<any | null> => {
  await ensureTable()
  const pool = await getMariaPool()
  const [rows] = await pool.query(`SELECT \`doc\` FROM \`${TABLE}\` WHERE \`_id\` = ?`, [id])
  const arr = rows as Array<{ doc: string }>
  if (!arr.length) return null
  return parse(arr[0].doc)
}

export const listSupplierInvoicesMaria = async (): Promise<any[]> => {
  await ensureTable()
  const pool = await getMariaPool()
  const [rows] = await pool.query(`SELECT \`doc\` FROM \`${TABLE}\``)
  const docs = (rows as Array<{ doc: string }>).map(r => parse(r.doc)).filter(Boolean)
  docs.sort((a, b) => new Date(b.createdAt || b.created_at || 0).getTime() - new Date(a.createdAt || a.created_at || 0).getTime())
  return docs
}

export const upsertSupplierInvoiceMaria = async (id: string, payload: any): Promise<any> => {
  await ensureTable()
  const pool = await getMariaPool()
  const doc = { ...payload, _id: id }
  await pool.query(
    `INSERT INTO \`${TABLE}\` (\`_id\`, \`doc\`) VALUES (?, ?) ON DUPLICATE KEY UPDATE \`doc\`=VALUES(\`doc\`)`,
    [id, JSON.stringify(doc)]
  )
  return doc
}

export const createSupplierInvoiceMaria = async (payload: any): Promise<any> => {
  const id = uuidv4()
  return await upsertSupplierInvoiceMaria(id, payload)
}

export const deleteSupplierInvoiceMaria = async (id: string): Promise<boolean> => {
  await ensureTable()
  const pool = await getMariaPool()
  const [res] = await pool.query(`DELETE FROM \`${TABLE}\` WHERE \`_id\` = ?`, [id])
  const info = res as any
  return !!(info.affectedRows > 0)
}

export const populateSupplierInvoiceMaria = async (invoice: any): Promise<any> => {
  const supplierId = invoice?.supplier ? String(invoice.supplier) : ''
  const supplier = supplierId ? await getSupplierByIdMaria(supplierId) : null

  const purchaseOrderIds = Array.isArray(invoice?.purchaseOrders) ? invoice.purchaseOrders.map(String) : []
  const purchaseOrders = []
  for (const id of purchaseOrderIds) {
    const po = await getPurchaseOrderByIdMaria(id)
    if (po) purchaseOrders.push(po)
  }

  const deliveryNoteIds = Array.isArray(invoice?.deliveryNotes) ? invoice.deliveryNotes.map(String) : []
  const deliveryNotes = []
  for (const id of deliveryNoteIds) {
    const dn = await getDeliveryNoteByIdMaria(id)
    if (dn) deliveryNotes.push(dn)
  }

  const items = Array.isArray(invoice?.items) ? invoice.items : []
  const populatedItems = []
  for (const it of items) {
    const invId = it?.inventoryItem ? String(it.inventoryItem) : ''
    const inv = invId ? await getInventoryItemByIdMaria(invId) : null
    populatedItems.push({ ...it, inventoryItem: inv || it.inventoryItem })
  }

  return {
    ...invoice,
    supplier: supplier || invoice.supplier,
    purchaseOrders,
    deliveryNotes,
    items: populatedItems,
  }
}

export const unlinkDeliveryNotesForInvoiceMaria = async (invoiceId: string, deliveryNoteIds: string[]) => {
  await setDeliveryNotesInvoiceMaria(deliveryNoteIds.map(String), null)
  void invoiceId
}
