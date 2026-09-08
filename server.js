import { spawn } from 'node:child_process'
import { resolve } from 'node:path'
import process from 'node:process'

const serverPath = resolve('api/_lib/server.ts')

const child = spawn(process.execPath, ['--loader', 'tsx', serverPath], {
  stdio: 'inherit',
  env: process.env,
})

const shutdown = (signal) => {
  if (!child.killed) child.kill(signal)
}

process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))

child.on('exit', (code) => {
  process.exit(code ?? 0)
})
