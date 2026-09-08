/**
 * local server entry file, for local development
 */
import 'dotenv/config';
import app from './app.js';
import { getMariaPool } from './config/mariadb.js';
import { inventoryService } from './services/inventoryService.js';

const startServer = async () => {
  const isProd = String(process.env.NODE_ENV || '').toLowerCase() === 'production'
  let initError: unknown | null = null

  try {
    await getMariaPool()
    await inventoryService.verifyAndLogInventoryOnStartup()
  } catch (e) {
    initError = e
    console.error('Database init failed', e)
    if (isProd) process.exit(1)
  }

  const PORT = process.env.PORT || 8084
  const server = app.listen(PORT, () => {
    console.log(`Server ready on port ${PORT}`)
    if (initError) console.log('Server started without database connectivity')
  })

  const shutdown = () => {
    console.log('Shutting down server...')
    server.close(() => {
      console.log('Server closed')
      process.exit(0)
    })
  }

  process.on('SIGTERM', shutdown)
  process.on('SIGINT', shutdown)
};

startServer();

export default app;
