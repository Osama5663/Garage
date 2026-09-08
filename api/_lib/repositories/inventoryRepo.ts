import { getMariaPool } from '../config/mariadb.js'
import { v4 as uuidv4 } from 'uuid'

const ITEMS_TABLE = 'inventory_items'
const MOVEMENTS_TABLE = 'stock_movements'

const ensureTables = async () => {
  const pool = await getMariaPool()
  await pool.query(
    `CREATE TABLE IF NOT EXISTS \`${ITEMS_TABLE}\` (
      \`_id\` VARCHAR(255) NOT NULL,
      \`doc\` LONGTEXT NOT NULL,
      PRIMARY KEY (\`_id\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`
  )
  await pool.query(
    `CREATE TABLE IF NOT EXISTS \`${MOVEMENTS_TABLE}\` (
      \`_id\` VARCHAR(255) NOT NULL,
      \`inventoryItemId\` VARCHAR(255) NOT NULL,
      \`doc\` LONGTEXT NOT NULL,
      \`movementDate\` DATETIME(3) NOT NULL,
      PRIMARY KEY (\`_id\`),
      INDEX \`idx_item_date\` (\`inventoryItemId\`, \`movementDate\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`
  )
}

export const listInventoryItemsMaria = async (filters: any = {}): Promise<any[]> => {
  await ensureTables()
  const pool = await getMariaPool()
  const [rows] = await pool.query(`SELECT \`doc\` FROM \`${ITEMS_TABLE}\``)
  let docs = (rows as Array<{ doc: string }>).map(r => JSON.parse(r.doc))

  docs = docs.filter((d) => {
    for (const [k, v] of Object.entries(filters || {})) {
      if (v === undefined) continue
      if ((d as any)[k] !== v) return false
    }
    return true
  })

  docs.sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), undefined, { sensitivity: 'base' }))
  return docs
}

export const getInventoryItemByIdMaria = async (id: string): Promise<any | null> => {
  await ensureTables()
  const pool = await getMariaPool()
  const [rows] = await pool.query(`SELECT \`doc\` FROM \`${ITEMS_TABLE}\` WHERE \`_id\` = ?`, [id])
  const arr = rows as Array<{ doc: string }>
  if (!arr.length) return null
  return JSON.parse(arr[0].doc)
}

export const getInventoryItemBySkuMaria = async (sku: string): Promise<any | null> => {
  const all = await listInventoryItemsMaria()
  const s = String(sku || '').trim().toLowerCase()
  return all.find(i => String(i.sku || '').trim().toLowerCase() === s) || null
}

export const createInventoryItemMaria = async (doc: any): Promise<any> => {
  await ensureTables()
  const pool = await getMariaPool()
  const id = doc?._id ? String(doc._id) : uuidv4()
  const payload = { ...doc, _id: id }
  await pool.query(
    `INSERT INTO \`${ITEMS_TABLE}\` (\`_id\`, \`doc\`) VALUES (?, ?) ON DUPLICATE KEY UPDATE \`doc\`=VALUES(\`doc\`)`,
    [id, JSON.stringify(payload)]
  )
  return payload
}

export const updateInventoryItemMaria = async (id: string, doc: any): Promise<any> => {
  await ensureTables()
  const pool = await getMariaPool()
  const payload = { ...doc, _id: id }
  await pool.query(
    `INSERT INTO \`${ITEMS_TABLE}\` (\`_id\`, \`doc\`) VALUES (?, ?) ON DUPLICATE KEY UPDATE \`doc\`=VALUES(\`doc\`)`,
    [id, JSON.stringify(payload)]
  )
  return payload
}

export const deleteInventoryItemMaria = async (id: string): Promise<boolean> => {
  await ensureTables()
  const pool = await getMariaPool()
  const [res] = await pool.query(`DELETE FROM \`${ITEMS_TABLE}\` WHERE \`_id\` = ?`, [id])
  const info = res as any
  return !!(info.affectedRows > 0)
}

export const createStockMovementMaria = async (movement: any): Promise<any> => {
  await ensureTables()
  const pool = await getMariaPool()
  const id = movement?._id ? String(movement._id) : uuidv4()
  const movementDate = movement?.movementDate ? new Date(movement.movementDate) : new Date()
  const payload = { ...movement, _id: id, movementDate: movementDate.toISOString() }
  await pool.query(
    `INSERT INTO \`${MOVEMENTS_TABLE}\` (\`_id\`, \`inventoryItemId\`, \`doc\`, \`movementDate\`)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE \`doc\`=VALUES(\`doc\`), \`movementDate\`=VALUES(\`movementDate\`)`,
    [id, String(payload.inventoryItemId || ''), JSON.stringify(payload), movementDate]
  )
  return payload
}

export const listStockMovementsMaria = async (filters: any = {}): Promise<any[]> => {
  await ensureTables()
  const pool = await getMariaPool()
  const where: string[] = []
  const params: any[] = []

  if (filters?.inventoryItemId) {
    where.push('`inventoryItemId` = ?')
    params.push(String(filters.inventoryItemId))
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : ''

  const [rows] = await pool.query(
    `SELECT \`doc\` FROM \`${MOVEMENTS_TABLE}\` ${whereSql} ORDER BY \`movementDate\` DESC`,
    params
  )
  return (rows as Array<{ doc: string }>).map(r => JSON.parse(r.doc))
}
