import { getMariaPool } from '../config/mariadb.js'
import { v4 as uuidv4 } from 'uuid'

const METHODS_TABLE = 'payment_methods'
const PAYMENTS_TABLE = 'payments'
const ALLOCATIONS_TABLE = 'payment_allocations'

const ensureTables = async () => {
  const pool = await getMariaPool()
  await pool.query(
    `CREATE TABLE IF NOT EXISTS \`${METHODS_TABLE}\` (
      \`_id\` VARCHAR(255) NOT NULL,
      \`doc\` LONGTEXT NOT NULL,
      PRIMARY KEY (\`_id\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`
  )
  await pool.query(
    `CREATE TABLE IF NOT EXISTS \`${PAYMENTS_TABLE}\` (
      \`_id\` VARCHAR(255) NOT NULL,
      \`doc\` LONGTEXT NOT NULL,
      PRIMARY KEY (\`_id\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`
  )
  await pool.query(
    `CREATE TABLE IF NOT EXISTS \`${ALLOCATIONS_TABLE}\` (
      \`_id\` VARCHAR(255) NOT NULL,
      \`payment_id\` VARCHAR(255) NOT NULL,
      \`doc\` LONGTEXT NOT NULL,
      PRIMARY KEY (\`_id\`),
      INDEX \`idx_payment\` (\`payment_id\`)
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

export const ensureDefaultPaymentMethodsMaria = async () => {
  await ensureTables()
  const pool = await getMariaPool()
  const [rows] = await pool.query(`SELECT \`doc\` FROM \`${METHODS_TABLE}\``)
  if ((rows as any[]).length > 0) return
  const defaults = [
    { name: 'Cash', type: 'cash', is_active: true },
    { name: 'Credit Card', type: 'credit_card', is_active: true },
    { name: 'Bank Transfer', type: 'bank_transfer', is_active: true },
    { name: 'Check', type: 'check', is_active: true },
    { name: 'Other', type: 'other', is_active: true },
  ]
  for (const d of defaults) {
    const id = uuidv4()
    await pool.query(
      `INSERT INTO \`${METHODS_TABLE}\` (\`_id\`, \`doc\`) VALUES (?, ?)`,
      [id, JSON.stringify({ ...d, _id: id })]
    )
  }
}

export const listPaymentMethodsMaria = async (): Promise<any[]> => {
  await ensureDefaultPaymentMethodsMaria()
  const pool = await getMariaPool()
  const [rows] = await pool.query(`SELECT \`doc\` FROM \`${METHODS_TABLE}\``)
  const docs = (rows as Array<{ doc: string }>).map(r => parse(r.doc)).filter(Boolean)
  return docs.filter(d => d.is_active).sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')))
}

export const getPaymentMethodByIdMaria = async (id: string): Promise<any | null> => {
  await ensureTables()
  const pool = await getMariaPool()
  const [rows] = await pool.query(`SELECT \`doc\` FROM \`${METHODS_TABLE}\` WHERE \`_id\` = ?`, [id])
  const arr = rows as Array<{ doc: string }>
  if (!arr.length) return null
  return parse(arr[0].doc)
}

export const createPaymentMaria = async (payload: any): Promise<any> => {
  await ensureTables()
  const pool = await getMariaPool()
  const id = uuidv4()
  const doc = { ...payload, _id: id, id }
  await pool.query(
    `INSERT INTO \`${PAYMENTS_TABLE}\` (\`_id\`, \`doc\`) VALUES (?, ?)`,
    [id, JSON.stringify(doc)]
  )
  return doc
}

export const updatePaymentMaria = async (id: string, payload: any): Promise<any> => {
  await ensureTables()
  const pool = await getMariaPool()
  const doc = { ...payload, _id: id, id }
  await pool.query(
    `INSERT INTO \`${PAYMENTS_TABLE}\` (\`_id\`, \`doc\`) VALUES (?, ?) ON DUPLICATE KEY UPDATE \`doc\`=VALUES(\`doc\`)`,
    [id, JSON.stringify(doc)]
  )
  return doc
}

export const getPaymentByIdMaria = async (id: string): Promise<any | null> => {
  await ensureTables()
  const pool = await getMariaPool()
  const [rows] = await pool.query(`SELECT \`doc\` FROM \`${PAYMENTS_TABLE}\` WHERE \`_id\` = ?`, [id])
  const arr = rows as Array<{ doc: string }>
  if (!arr.length) return null
  return parse(arr[0].doc)
}

export const listPaymentsMaria = async (filters: any): Promise<any[]> => {
  await ensureTables()
  const pool = await getMariaPool()
  const [rows] = await pool.query(`SELECT \`doc\` FROM \`${PAYMENTS_TABLE}\``)
  let docs = (rows as Array<{ doc: string }>).map(r => parse(r.doc)).filter(Boolean)

  const f = filters || {}
  if (f.party_type) docs = docs.filter(d => d.party_type === f.party_type)
  if (f.party_id) docs = docs.filter(d => String(d.party_id) === String(f.party_id))
  if (f.invoice_id) docs = docs.filter(d => String(d.invoice_id) === String(f.invoice_id))
  if (f.status) docs = docs.filter(d => d.status === f.status)
  if (f.start_date) {
    const from = new Date(String(f.start_date)).getTime()
    docs = docs.filter(d => new Date(d.payment_date || 0).getTime() >= from)
  }
  if (f.end_date) {
    const to = new Date(String(f.end_date)).getTime()
    docs = docs.filter(d => new Date(d.payment_date || 0).getTime() <= to)
  }
  docs.sort((a, b) => new Date(b.payment_date || 0).getTime() - new Date(a.payment_date || 0).getTime())
  return docs
}

export const upsertAllocationsMaria = async (paymentId: string, allocations: any[]) => {
  await ensureTables()
  const pool = await getMariaPool()
  const [rows] = await pool.query(`SELECT \`_id\`, \`doc\` FROM \`${ALLOCATIONS_TABLE}\` WHERE \`payment_id\` = ?`, [paymentId])
  const existing = rows as Array<{ _id: string; doc: string }>
  for (const r of existing) {
    await pool.query(`DELETE FROM \`${ALLOCATIONS_TABLE}\` WHERE \`_id\` = ?`, [r._id])
  }
  const inserted = []
  for (const a of allocations) {
    const id = uuidv4()
    const doc = { ...a, _id: id, payment_id: paymentId }
    await pool.query(
      `INSERT INTO \`${ALLOCATIONS_TABLE}\` (\`_id\`, \`payment_id\`, \`doc\`) VALUES (?, ?, ?)`,
      [id, paymentId, JSON.stringify(doc)]
    )
    inserted.push(doc)
  }
  return inserted
}
