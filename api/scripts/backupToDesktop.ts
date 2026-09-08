import fs from 'fs'
import path from 'path'
import os from 'os'
import mysql from 'mysql2/promise'

const EXPORT_FORMAT = (process.env.EXPORT_FORMAT || 'json').toLowerCase()

const desktopPath = path.join(os.homedir(), 'Desktop')
const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
const backupDir = path.join(desktopPath, `garage_backup_${timestamp}`)

const sqlIdent = (name: string) => `\`${String(name).replace(/`/g, '``')}\``
const sqlString = (value: any) => {
  if (value === null || value === undefined) return 'NULL'
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  if (typeof value === 'boolean') return value ? '1' : '0'
  const s = value instanceof Date ? value.toISOString() : String(value)
  return `'${s.replace(/\\/g, '\\\\').replace(/'/g, "''")}'`
}

const ensureDir = () => {
  if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true })
}

async function backup() {
  const host = process.env.MARIADB_HOST || '127.0.0.1'
  const port = Number(process.env.MARIADB_PORT || 3306)
  const user = process.env.MARIADB_USER || 'root'
  const password = process.env.MARIADB_PASSWORD || ''
  const database = process.env.MARIADB_DATABASE || 'garage'

  ensureDir()

  const conn = await mysql.createConnection({
    host,
    port,
    user,
    password,
    database,
    multipleStatements: false,
  })

  try {
    const [tablesRows] = await conn.query(`SHOW TABLES`)
    const tables = (tablesRows as any[]).map(r => String(Object.values(r)[0]))

    if (EXPORT_FORMAT === 'sql') {
      const outPath = path.join(backupDir, `garage_backup_${timestamp}.sql`)
      const lines: string[] = []
      lines.push('START TRANSACTION;')
      lines.push('SET NAMES utf8mb4;')
      lines.push('SET time_zone = "+00:00";')

      for (const table of tables) {
        const [[createRow]]: any = await conn.query(`SHOW CREATE TABLE ${sqlIdent(table)}`)
        const createStmt = createRow['Create Table']
        lines.push('')
        lines.push(`DROP TABLE IF EXISTS ${sqlIdent(table)};`)
        lines.push(`${createStmt};`)

        const [rows] = await conn.query(`SELECT * FROM ${sqlIdent(table)}`)
        const data = rows as any[]
        if (!data.length) continue

        const columns = Object.keys(data[0])
        const colSql = columns.map(sqlIdent).join(', ')
        for (const row of data) {
          const valuesSql = columns.map(c => sqlString(row[c])).join(', ')
          lines.push(`INSERT INTO ${sqlIdent(table)} (${colSql}) VALUES (${valuesSql});`)
        }
      }

      lines.push('COMMIT;')
      fs.writeFileSync(outPath, lines.join('\n'), 'utf8')
      console.log(`Backup SQL saved: ${outPath}`)
      return
    }

    for (const table of tables) {
      const [rows] = await conn.query(`SELECT * FROM ${sqlIdent(table)}`)
      const filePath = path.join(backupDir, `${table}.json`)
      fs.writeFileSync(filePath, JSON.stringify(rows, null, 2), 'utf8')
    }
    console.log(`Backup JSON saved: ${backupDir}`)
  } finally {
    await conn.end()
  }
}

backup().catch((err) => {
  console.error('Backup failed:', err)
  process.exitCode = 1
})
