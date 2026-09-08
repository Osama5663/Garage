import { getMariaPool } from '../config/mariadb.js'
import { getSupplierByIdMaria } from './suppliersRepo.js'
import { v4 as uuidv4 } from 'uuid'

const TABLE = 'purchase_orders'

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

export const getPurchaseOrderByIdMaria = async (id: string): Promise<any | null> => {
  await ensureTable()
  const pool = await getMariaPool()
  const [rows] = await pool.query(`SELECT \`doc\` FROM \`${TABLE}\` WHERE \`_id\` = ?`, [id])
  const arr = rows as Array<{ doc: string }>
  if (!arr.length) return null
  return parse(arr[0].doc)
}

export const listPurchaseOrdersMaria = async (filters?: {
  supplier_id?: string
  status?: string
  order_date_from?: string
  order_date_to?: string
  search?: string
}): Promise<any[]> => {
  await ensureTable()
  const pool = await getMariaPool()
  const [rows] = await pool.query(`SELECT \`doc\` FROM \`${TABLE}\``)
  let docs = (rows as Array<{ doc: string }>).map(r => parse(r.doc)).filter(Boolean)

  if (filters?.supplier_id) {
    docs = docs.filter(d => String(d.supplier_id || '') === String(filters.supplier_id))
  }
  if (filters?.status) {
    docs = docs.filter(d => String(d.status || '') === String(filters.status))
  }
  if (filters?.order_date_from) {
    const from = new Date(filters.order_date_from).getTime()
    docs = docs.filter(d => new Date(d.order_date || 0).getTime() >= from)
  }
  if (filters?.order_date_to) {
    const to = new Date(filters.order_date_to).getTime()
    docs = docs.filter(d => new Date(d.order_date || 0).getTime() <= to)
  }
  if (filters?.search) {
    const s = String(filters.search).trim().toLowerCase()
    if (s) {
      docs = docs.filter(d => {
        const hay = `${String(d.po_number || '')} ${String(d.suppliers?.name || '')} ${String(d.supplier?.name || '')}`.toLowerCase()
        return hay.includes(s)
      })
    }
  }

  docs.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
  return docs
}

export const createPurchaseOrderMaria = async (payload: any): Promise<any> => {
  await ensureTable()
  const pool = await getMariaPool()
  const id = uuidv4()
  const supplier = payload?.supplier_id ? await getSupplierByIdMaria(String(payload.supplier_id)) : null
  const doc = {
    ...payload,
    id,
    suppliers: supplier ? { name: supplier.name } : payload.suppliers,
    supplier: supplier ? { name: supplier.name } : payload.supplier,
  }
  await pool.query(
    `INSERT INTO \`${TABLE}\` (\`_id\`, \`doc\`) VALUES (?, ?) ON DUPLICATE KEY UPDATE \`doc\`=VALUES(\`doc\`)`,
    [id, JSON.stringify(doc)]
  )
  return doc
}

export const updatePurchaseOrderMaria = async (id: string, payload: any): Promise<any> => {
  await ensureTable()
  const pool = await getMariaPool()
  const supplier = payload?.supplier_id ? await getSupplierByIdMaria(String(payload.supplier_id)) : null
  const doc = {
    ...payload,
    id,
    suppliers: supplier ? { name: supplier.name } : payload.suppliers,
    supplier: supplier ? { name: supplier.name } : payload.supplier,
  }
  await pool.query(
    `INSERT INTO \`${TABLE}\` (\`_id\`, \`doc\`) VALUES (?, ?) ON DUPLICATE KEY UPDATE \`doc\`=VALUES(\`doc\`)`,
    [id, JSON.stringify(doc)]
  )
  return doc
}

export const deletePurchaseOrderMaria = async (id: string): Promise<boolean> => {
  await ensureTable()
  const pool = await getMariaPool()
  const [res] = await pool.query(`DELETE FROM \`${TABLE}\` WHERE \`_id\` = ?`, [id])
  const info = res as any
  return !!(info.affectedRows > 0)
}
