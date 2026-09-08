import { getMariaPool } from '../config/mariadb.js'

const TABLE = 'client_state'

const ensureTable = async () => {
  const pool = await getMariaPool()
  await pool.query(
    `CREATE TABLE IF NOT EXISTS \`${TABLE}\` (
      \`userId\` VARCHAR(255) NOT NULL,
      \`key\` VARCHAR(255) NOT NULL,
      \`value\` LONGTEXT NOT NULL,
      \`updatedAt\` DATETIME(3) NOT NULL,
      PRIMARY KEY (\`userId\`, \`key\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`
  )
}

export const getClientStateValue = async (userId: string, key: string): Promise<any | null> => {
  await ensureTable()
  const pool = await getMariaPool()
  const [rows] = await pool.query(`SELECT \`value\` FROM \`${TABLE}\` WHERE \`userId\` = ? AND \`key\` = ?`, [
    userId,
    key,
  ])
  const arr = rows as Array<{ value: string }>
  if (!arr.length) return null
  return JSON.parse(arr[0].value)
}

export const upsertClientStateValue = async (userId: string, key: string, value: any): Promise<any> => {
  await ensureTable()
  const pool = await getMariaPool()
  const json = JSON.stringify(value)
  await pool.query(
    `INSERT INTO \`${TABLE}\` (\`userId\`, \`key\`, \`value\`, \`updatedAt\`)
     VALUES (?, ?, ?, NOW(3))
     ON DUPLICATE KEY UPDATE \`value\`=VALUES(\`value\`), \`updatedAt\`=VALUES(\`updatedAt\`)`,
    [userId, key, json]
  )
  return value
}

export const deleteClientStateValue = async (userId: string, key: string): Promise<void> => {
  await ensureTable()
  const pool = await getMariaPool()
  await pool.query(`DELETE FROM \`${TABLE}\` WHERE \`userId\` = ? AND \`key\` = ?`, [userId, key])
}

export const clearAllClientStateValues = async (): Promise<void> => {
  await ensureTable()
  const pool = await getMariaPool()
  await pool.query(`DELETE FROM \`${TABLE}\``)
}
