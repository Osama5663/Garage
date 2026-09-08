import 'dotenv/config'
import mysql from 'mysql2/promise'

let pool: mysql.Pool | null = null

const env = {
  host: process.env.MARIADB_HOST || '127.0.0.1',
  port: Number(process.env.MARIADB_PORT || 3306),
  user: process.env.MARIADB_USER || 'root',
  password: process.env.MARIADB_PASSWORD || '',
  database: process.env.MARIADB_DATABASE || 'mongarage',
}

export const getMariaPool = async (): Promise<mysql.Pool> => {
  if (pool) return pool
  const conn = await mysql.createConnection({
    host: env.host,
    port: env.port,
    user: env.user,
    password: env.password,
    multipleStatements: false,
  })
  try {
    await conn.query(
      `CREATE DATABASE IF NOT EXISTS \`${env.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`
    )
  } finally {
    await conn.end()
  }
  pool = mysql.createPool({
    host: env.host,
    port: env.port,
    user: env.user,
    password: env.password,
    database: env.database,
    connectionLimit: 10,
    namedPlaceholders: true,
  })
  return pool
}

export const isMariaMode = (): boolean => {
  const v = String(process.env.DB_ENGINE || 'mariadb').trim().toLowerCase()
  return v === 'mariadb' || v === 'mysql'
}
