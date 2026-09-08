import { getMariaPool } from '../config/mariadb.js'
import { v4 as uuidv4 } from 'uuid'

const TABLE = 'mechanics'

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

export const listMechanicsMaria = async (): Promise<any[]> => {
  await ensureTable()
  const pool = await getMariaPool()
  const [rows] = await pool.query(`SELECT \`doc\` FROM \`${TABLE}\``)
  const docs = (rows as Array<{ doc: string }>).map(r => parse(r.doc)).filter(Boolean)
  docs.sort((a, b) => new Date(b.createdAt || b.created_at || 0).getTime() - new Date(a.createdAt || b.created_at || 0).getTime())
  return docs
}

export const getMechanicByIdMaria = async (id: string): Promise<any | null> => {
  await ensureTable()
  const pool = await getMariaPool()
  const [rows] = await pool.query(`SELECT \`doc\` FROM \`${TABLE}\` WHERE \`_id\` = ?`, [id])
  const arr = rows as Array<{ doc: string }>
  if (!arr.length) return null
  return parse(arr[0].doc)
}

export const createMechanicMaria = async (payload: any): Promise<any> => {
  await ensureTable()
  const pool = await getMariaPool()
  const id = uuidv4()
  const doc = { ...payload, id }
  await pool.query(
    `INSERT INTO \`${TABLE}\` (\`_id\`, \`doc\`) VALUES (?, ?) ON DUPLICATE KEY UPDATE \`doc\`=VALUES(\`doc\`)`,
    [id, JSON.stringify(doc)]
  )
  return doc
}

export const updateMechanicMaria = async (id: string, payload: any): Promise<any> => {
  await ensureTable()
  const pool = await getMariaPool()
  const doc = { ...payload, id }
  await pool.query(
    `INSERT INTO \`${TABLE}\` (\`_id\`, \`doc\`) VALUES (?, ?) ON DUPLICATE KEY UPDATE \`doc\`=VALUES(\`doc\`)`,
    [id, JSON.stringify(doc)]
  )
  return doc
}

export const deleteMechanicMaria = async (id: string): Promise<boolean> => {
  await ensureTable()
  const pool = await getMariaPool()
  const [res] = await pool.query(`DELETE FROM \`${TABLE}\` WHERE \`_id\` = ?`, [id])
  const info = res as any
  return !!(info.affectedRows > 0)
}
