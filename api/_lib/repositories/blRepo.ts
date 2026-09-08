import { getMariaPool } from '../config/mariadb.js'
import { v4 as uuidv4 } from 'uuid'

const BL_TABLE = 'bl_documents'
const INV_TABLE = 'bl_invoices'

const ensureTables = async () => {
  const pool = await getMariaPool()
  await pool.query(
    `CREATE TABLE IF NOT EXISTS \`${BL_TABLE}\` (
      \`_id\` VARCHAR(255) NOT NULL,
      \`doc\` LONGTEXT NOT NULL,
      PRIMARY KEY (\`_id\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`
  )
  await pool.query(
    `CREATE TABLE IF NOT EXISTS \`${INV_TABLE}\` (
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

export const findBLByNumberMaria = async (blNumber: string): Promise<any | null> => {
  await ensureTables()
  const pool = await getMariaPool()
  const [rows] = await pool.query(`SELECT \`doc\` FROM \`${BL_TABLE}\``)
  const docs = (rows as Array<{ doc: string }>).map(r => parse(r.doc)).filter(Boolean)
  const n = String(blNumber || '').trim().toLowerCase()
  return docs.find(d => String(d.blNumber || '').trim().toLowerCase() === n) || null
}

export const createBLDocumentMaria = async (payload: any): Promise<any> => {
  await ensureTables()
  const pool = await getMariaPool()
  const id = uuidv4()
  const doc = { ...payload, _id: id, id }
  await pool.query(
    `INSERT INTO \`${BL_TABLE}\` (\`_id\`, \`doc\`) VALUES (?, ?)`,
    [id, JSON.stringify(doc)]
  )
  return doc
}

export const getBLDocumentByIdMaria = async (id: string): Promise<any | null> => {
  await ensureTables()
  const pool = await getMariaPool()
  const [rows] = await pool.query(`SELECT \`doc\` FROM \`${BL_TABLE}\` WHERE \`_id\` = ?`, [id])
  const arr = rows as Array<{ doc: string }>
  if (!arr.length) return null
  return parse(arr[0].doc)
}

export const updateBLDocumentMaria = async (id: string, payload: any): Promise<any> => {
  await ensureTables()
  const pool = await getMariaPool()
  const doc = { ...payload, _id: id, id }
  await pool.query(
    `INSERT INTO \`${BL_TABLE}\` (\`_id\`, \`doc\`) VALUES (?, ?) ON DUPLICATE KEY UPDATE \`doc\`=VALUES(\`doc\`)`,
    [id, JSON.stringify(doc)]
  )
  return doc
}

export const listBLDocumentsMaria = async (filters: any): Promise<any[]> => {
  await ensureTables()
  const pool = await getMariaPool()
  const [rows] = await pool.query(`SELECT \`doc\` FROM \`${BL_TABLE}\``)
  let docs = (rows as Array<{ doc: string }>).map(r => parse(r.doc)).filter(Boolean)

  if (filters?.supplierId) docs = docs.filter(d => String(d.supplierId) === String(filters.supplierId))
  if (filters?.status) docs = docs.filter(d => String(d.status) === String(filters.status))
  if (filters?.startDate) {
    const from = new Date(filters.startDate).getTime()
    docs = docs.filter(d => new Date(d.blDate || 0).getTime() >= from)
  }
  if (filters?.endDate) {
    const to = new Date(filters.endDate).getTime()
    docs = docs.filter(d => new Date(d.blDate || 0).getTime() <= to)
  }
  if (filters?.search) {
    const s = String(filters.search).trim().toLowerCase()
    if (s) {
      docs = docs.filter(d => {
        const hay = `${String(d.blNumber || '')} ${String(d.originalFilename || '')}`.toLowerCase()
        return hay.includes(s)
      })
    }
  }

  docs.sort((a, b) => new Date(b.blDate || 0).getTime() - new Date(a.blDate || 0).getTime())
  return docs
}

export const createInvoiceMaria = async (payload: any): Promise<any> => {
  await ensureTables()
  const pool = await getMariaPool()
  const id = uuidv4()
  const doc = { ...payload, _id: id, id }
  await pool.query(
    `INSERT INTO \`${INV_TABLE}\` (\`_id\`, \`doc\`) VALUES (?, ?)`,
    [id, JSON.stringify(doc)]
  )
  return doc
}

export const getInvoiceByIdMaria = async (id: string): Promise<any | null> => {
  await ensureTables()
  const pool = await getMariaPool()
  const [rows] = await pool.query(`SELECT \`doc\` FROM \`${INV_TABLE}\` WHERE \`_id\` = ?`, [id])
  const arr = rows as Array<{ doc: string }>
  if (!arr.length) return null
  return parse(arr[0].doc)
}

export const updateInvoiceMaria = async (id: string, payload: any): Promise<any> => {
  await ensureTables()
  const pool = await getMariaPool()
  const doc = { ...payload, _id: id, id }
  await pool.query(
    `INSERT INTO \`${INV_TABLE}\` (\`_id\`, \`doc\`) VALUES (?, ?) ON DUPLICATE KEY UPDATE \`doc\`=VALUES(\`doc\`)`,
    [id, JSON.stringify(doc)]
  )
  return doc
}

export const listInvoicesMaria = async (filters: any): Promise<any[]> => {
  await ensureTables()
  const pool = await getMariaPool()
  const [rows] = await pool.query(`SELECT \`doc\` FROM \`${INV_TABLE}\``)
  let docs = (rows as Array<{ doc: string }>).map(r => parse(r.doc)).filter(Boolean)

  if (filters?.supplierId) docs = docs.filter(d => String(d.supplierId) === String(filters.supplierId))
  if (filters?.status) docs = docs.filter(d => String(d.status) === String(filters.status))
  if (filters?.startDate) {
    const from = new Date(filters.startDate).getTime()
    docs = docs.filter(d => new Date(d.invoiceDate || 0).getTime() >= from)
  }
  if (filters?.endDate) {
    const to = new Date(filters.endDate).getTime()
    docs = docs.filter(d => new Date(d.invoiceDate || 0).getTime() <= to)
  }

  docs.sort((a, b) => new Date(b.invoiceDate || 0).getTime() - new Date(a.invoiceDate || 0).getTime())
  return docs
}

export const listBLByIdsMaria = async (ids: string[]): Promise<any[]> => {
  const docs = []
  for (const id of ids) {
    const d = await getBLDocumentByIdMaria(id)
    if (d) docs.push(d)
  }
  return docs
}

export const allBLDocumentsMaria = async (): Promise<any[]> => {
  await ensureTables()
  const pool = await getMariaPool()
  const [rows] = await pool.query(`SELECT \`doc\` FROM \`${BL_TABLE}\``)
  return (rows as Array<{ doc: string }>).map(r => parse(r.doc)).filter(Boolean)
}

export const allInvoicesMaria = async (): Promise<any[]> => {
  await ensureTables()
  const pool = await getMariaPool()
  const [rows] = await pool.query(`SELECT \`doc\` FROM \`${INV_TABLE}\``)
  return (rows as Array<{ doc: string }>).map(r => parse(r.doc)).filter(Boolean)
}
