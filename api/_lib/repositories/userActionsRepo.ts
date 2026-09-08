import { getMariaPool } from '../config/mariadb.js'
import { v4 as uuidv4 } from 'uuid'

const TABLE = 'user_actions'

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

export const insertUserActionMaria = async (row: {
  userId: string
  username: string
  action: string
  result: string
  timestamp?: Date
}): Promise<void> => {
  await ensureTable()
  const pool = await getMariaPool()
  const id = uuidv4()
  const ts = row.timestamp || new Date()
  const doc = {
    _id: id,
    userId: row.userId,
    username: row.username,
    action: row.action,
    result: row.result,
    timestamp: ts.toISOString(),
  }
  await pool.query(
    `INSERT INTO \`${TABLE}\` (\`_id\`, \`doc\`) VALUES (?, ?)
     ON DUPLICATE KEY UPDATE \`doc\`=VALUES(\`doc\`)`,
    [id, JSON.stringify(doc)]
  )
}

export interface UserActionQuery {
  userId?: string
  action?: string
  search?: string
  startDate?: Date
  endDate?: Date
  page?: number
  limit?: number
}

const normalizeText = (value: any) => String(value ?? '').toLowerCase()

const matchesFilter = (doc: any, q: UserActionQuery): boolean => {
  if (q.userId && String(doc.userId) !== String(q.userId)) return false
  if (q.action && String(doc.action) !== String(q.action)) return false
  if (q.startDate) {
    const t = new Date(doc.timestamp || 0).getTime()
    if (t < q.startDate.getTime()) return false
  }
  if (q.endDate) {
    const t = new Date(doc.timestamp || 0).getTime()
    if (t > q.endDate.getTime()) return false
  }
  if (q.search) {
    const s = normalizeText(q.search)
    const hay = `${normalizeText(doc.action)} ${normalizeText(doc.username)} ${normalizeText(doc.result)}`
    if (!hay.includes(s)) return false
  }
  return true
}

export const countUserActionsMaria = async (q: UserActionQuery): Promise<number> => {
  await ensureTable()
  const pool = await getMariaPool()
  const [rows] = await pool.query(`SELECT \`doc\` FROM \`${TABLE}\``)
  const docs = (rows as Array<{ doc: string }>).map(r => JSON.parse(r.doc)).filter(d => matchesFilter(d, q))
  return docs.length
}

export const listUserActionsMaria = async (q: UserActionQuery): Promise<any[]> => {
  await ensureTable()
  const pool = await getMariaPool()
  const page = Math.max(1, q.page || 1)
  const limit = Math.min(200, Math.max(1, q.limit || 50))
  const offset = (page - 1) * limit

  const [rows] = await pool.query(`SELECT \`doc\` FROM \`${TABLE}\``)
  const all = (rows as Array<{ doc: string }>).map(r => JSON.parse(r.doc)).filter(d => matchesFilter(d, q))
  all.sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime())
  const pageItems = all.slice(offset, offset + limit)
  return pageItems.map(d => ({
    id: String(d._id || d.id || ''),
    userId: String(d.userId || ''),
    username: String(d.username || ''),
    action: String(d.action || ''),
    result: String(d.result || ''),
    timestamp: new Date(d.timestamp || 0).toISOString(),
  }))
}

export const userActionStatsMaria = async (q: { userId?: string; startDate?: Date; endDate?: Date }) => {
  await ensureTable()
  const pool = await getMariaPool()
  const [rows] = await pool.query(`SELECT \`doc\` FROM \`${TABLE}\``)
  const docs = (rows as Array<{ doc: string }>).map(r => JSON.parse(r.doc)).filter(d =>
    matchesFilter(d, { userId: q.userId, startDate: q.startDate, endDate: q.endDate })
  )

  const byType = new Map<string, number>()
  const byDay = new Map<string, number>()
  const byUser = new Map<string, number>()

  for (const d of docs) {
    const action = String(d.action || '')
    byType.set(action, (byType.get(action) || 0) + 1)

    const date = new Date(d.timestamp || 0)
    const dayKey = Number.isFinite(date.getTime()) ? date.toISOString().slice(0, 10) : 'invalid'
    byDay.set(dayKey, (byDay.get(dayKey) || 0) + 1)

    const userId = String(d.userId || '')
    byUser.set(userId, (byUser.get(userId) || 0) + 1)
  }

  const actionsByType = Array.from(byType.entries())
    .map(([action, count]) => ({ action, count }))
    .sort((a, b) => b.count - a.count)

  const actionsByDay = Array.from(byDay.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date))

  const topUsers = Array.from(byUser.entries())
    .map(([userId, count]) => ({ userId, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  return { actionsByType, actionsByDay, topUsers }
}

export const deleteUserActionsMaria = async (q: { userId?: string; startDate?: Date; endDate?: Date }) => {
  await ensureTable()
  const pool = await getMariaPool()
  const [rows] = await pool.query(`SELECT \`_id\`, \`doc\` FROM \`${TABLE}\``)
  const all = rows as Array<{ _id: string; doc: string }>
  const ids = all
    .map(r => ({ id: String(r._id), doc: JSON.parse(r.doc) }))
    .filter(r => matchesFilter(r.doc, { userId: q.userId, startDate: q.startDate, endDate: q.endDate }))
    .map(r => r.id)

  for (let i = 0; i < ids.length; i += 200) {
    const batch = ids.slice(i, i + 200)
    const placeholders = batch.map(() => '?').join(',')
    await pool.query(`DELETE FROM \`${TABLE}\` WHERE \`_id\` IN (${placeholders})`, batch)
  }
}
