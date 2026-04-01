import Fastify from 'fastify'
import cors from '@fastify/cors'
import multipart from '@fastify/multipart'
import { runMigrations } from '@datamanager/db'
import dbPlugin from './db.js'
import datasetRoutes from './routes/datasets.js'

const app = Fastify({ logger: true })

await app.register(cors, {
  origin: process.env.FRONTEND_URL ?? 'http://localhost:5173',
})

await app.register(multipart, {
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
})

await app.register(dbPlugin)
await app.register(datasetRoutes)

app.get('/health', async () => {
  return { status: 'ok', version: '0.1.0' }
})

app.get('/api/v1/status', async () => {
  return {
    service: 'datamanager-api',
    status: 'running',
    timestamp: new Date().toISOString(),
  }
})

const port = Number(process.env.PORT ?? 3000)
const host = process.env.HOST ?? '0.0.0.0'

try {
  const dbUrl = process.env.DATABASE_URL ?? 'postgresql://localhost:5432/datamanager'
  await runMigrations(dbUrl)
  await app.listen({ port, host })
  console.log(`API running at http://${host}:${port}`)
} catch (err) {
  app.log.error(err)
  process.exit(1)
}
