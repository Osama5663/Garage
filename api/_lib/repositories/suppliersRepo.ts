import { getMariaPool } from '../config/mariadb.js'
import { v4 as uuidv4 } from 'uuid'

const SUPPLIERS_TABLE = 'suppliers'
const AUDIT_TABLE = 'supplier_audit'

const ensureTables = async () => {
  const pool = await getMariaPool()
  await pool.query(
    `CREATE TABLE IF NOT EXISTS \`${SUPPLIERS_TABLE}\` (
      \`_id\` VARCHAR(255) NOT NULL,
      \`doc\` LONGTEXT NOT NULL,
      PRIMARY KEY (\`_id\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`
  )
  await pool.query(
    `CREATE TABLE IF NOT EXISTS \`${AUDIT_TABLE}\` (
      \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      \`supplierId\` VARCHAR(255) NOT NULL,
      \`action\` VARCHAR(32) NOT NULL,
      \`performedBy\` VARCHAR(255) NOT NULL,
      \`timestamp\` DATETIME(3) NOT NULL,
      \`changes\` LONGTEXT NULL,
      \`reason\` VARCHAR(255) NULL,
      PRIMARY KEY (\`id\`),
      INDEX \`idx_supplier_ts\` (\`supplierId\`, \`timestamp\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`
  )
}

export const supplierAuditLog = async (entry: {
  supplierId: string
  action: string
  performedBy: string
  timestamp?: Date
  changes?: any
  reason?: string
}): Promise<void> => {
  await ensureTables()
  const pool = await getMariaPool()
  await pool.query(
    `INSERT INTO \`${AUDIT_TABLE}\` (\`supplierId\`, \`action\`, \`performedBy\`, \`timestamp\`, \`changes\`, \`reason\`)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      entry.supplierId,
      entry.action,
      entry.performedBy,
      (entry.timestamp || new Date()),
      entry.changes === undefined ? null : JSON.stringify(entry.changes),
      entry.reason || null,
    ]
  )
}

export const listSuppliersMaria = async (): Promise<any[]> => {
  await ensureTables()
  const pool = await getMariaPool()
  const [rows] = await pool.query(`SELECT \`doc\` FROM \`${SUPPLIERS_TABLE}\``)
  const docs = (rows as Array<{ doc: string }>).map(r => JSON.parse(r.doc))
  docs.sort((a, b) => {
    const ta = new Date(a.createdAt || a.created_at || 0).getTime()
    const tb = new Date(b.createdAt || b.created_at || 0).getTime()
    return tb - ta
  })
  return docs
}

export const getSupplierByIdMaria = async (id: string): Promise<any | null> => {
  await ensureTables()
  const pool = await getMariaPool()
  const [rows] = await pool.query(`SELECT \`doc\` FROM \`${SUPPLIERS_TABLE}\` WHERE \`_id\` = ?`, [id])
  const arr = rows as Array<{ doc: string }>
  if (!arr.length) return null
  return JSON.parse(arr[0].doc)
}

export const getSupplierByEmailMaria = async (email: string): Promise<any | null> => {
  const suppliers = await listSuppliersMaria()
  const normalized = String(email || '').trim().toLowerCase()
  return suppliers.find(s => String(s.email || '').trim().toLowerCase() === normalized) || null
}

export const createSupplierMaria = async (doc: any): Promise<any> => {
  await ensureTables()
  const pool = await getMariaPool()
  const id = doc?._id ? String(doc._id) : uuidv4()
  const payload = { ...doc, _id: id }
  await pool.query(
    `INSERT INTO \`${SUPPLIERS_TABLE}\` (\`_id\`, \`doc\`) VALUES (?, ?) ON DUPLICATE KEY UPDATE \`doc\`=VALUES(\`doc\`)`,
    [id, JSON.stringify(payload)]
  )
  return payload
}

export const updateSupplierMaria = async (id: string, doc: any): Promise<any> => {
  await ensureTables()
  const pool = await getMariaPool()
  const payload = { ...doc, _id: id }
  await pool.query(
    `INSERT INTO \`${SUPPLIERS_TABLE}\` (\`_id\`, \`doc\`) VALUES (?, ?) ON DUPLICATE KEY UPDATE \`doc\`=VALUES(\`doc\`)`,
    [id, JSON.stringify(payload)]
  )
  return payload
}

export const deleteSupplierMaria = async (id: string): Promise<boolean> => {
  await ensureTables()
  const pool = await getMariaPool()
  const [res] = await pool.query(`DELETE FROM \`${SUPPLIERS_TABLE}\` WHERE \`_id\` = ?`, [id])
  const info = res as any
  return !!(info.affectedRows > 0)
}
