import { getMariaPool } from '../config/mariadb.js'
import { v4 as uuidv4 } from 'uuid'

const TABLE = 'documents'

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

export const listDocuments = async (): Promise<any[]> => {
  await ensureTable()
  const pool = await getMariaPool()
  const [rows] = await pool.query(`SELECT \`_id\`, \`doc\` FROM \`${TABLE}\``)
  const docs = (rows as Array<{ _id: string; doc: string }>).map(r => JSON.parse(r.doc))
  docs.sort((a, b) => {
    const ta = new Date(a.createdAt || a.created_at || 0).getTime()
    const tb = new Date(b.createdAt || b.created_at || 0).getTime()
    return tb - ta
  })
  return docs
}

export const getDocumentById = async (id: string): Promise<any | null> => {
  await ensureTable()
  const pool = await getMariaPool()
  const [rows] = await pool.query(`SELECT \`doc\` FROM \`${TABLE}\` WHERE \`_id\` = ?`, [id])
  const arr = rows as Array<{ doc: string }>
  if (!arr.length) return null
  return JSON.parse(arr[0].doc)
}

export const createDocument = async (payload: any): Promise<any> => {
  await ensureTable()
  const pool = await getMariaPool()
  const now = new Date().toISOString()
  const doc = {
    _id: uuidv4(),
    title: payload.title,
    header: payload.header || { content: '', alignment: 'left' },
    body: payload.body || { content: '', alignment: 'left', images: [] },
    footer: payload.footer || { content: '', alignment: 'left' },
    createdAt: now,
    updatedAt: now,
  }
  const json = JSON.stringify(doc)
  await pool.query(
    `INSERT INTO \`${TABLE}\` (\`_id\`, \`doc\`) VALUES (?, ?) ON DUPLICATE KEY UPDATE \`doc\`=VALUES(\`doc\`)`,
    [doc._id, json]
  )
  return doc
}

export const updateDocument = async (id: string, payload: any): Promise<any | null> => {
  const existing = await getDocumentById(id)
  if (!existing) return null
  const now = new Date().toISOString()
  const updated = {
    ...existing,
    ...payload,
    updatedAt: now,
  }
  const pool = await getMariaPool()
  await pool.query(
    `INSERT INTO \`${TABLE}\` (\`_id\`, \`doc\`) VALUES (?, ?) ON DUPLICATE KEY UPDATE \`doc\`=VALUES(\`doc\`)`,
    [id, JSON.stringify(updated)]
  )
  return updated
}

export const deleteDocument = async (id: string): Promise<boolean> => {
  await ensureTable()
  const pool = await getMariaPool()
  const [res] = await pool.query(`DELETE FROM \`${TABLE}\` WHERE \`_id\` = ?`, [id])
  const info = res as any
  return !!(info.affectedRows > 0)
}
