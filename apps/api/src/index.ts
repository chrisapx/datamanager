import Fastify from 'fastify'
import cors from '@fastify/cors'

const app = Fastify({ logger: true })

await app.register(cors, {
  origin: process.env.FRONTEND_URL ?? 'http://localhost:5173',
})

app.get('/health', async () => {
  return { status: 'ok', version: '0.0.1' }
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
  await app.listen({ port, host })
  console.log(`API running at http://${host}:${port}`)
} catch (err) {
  app.log.error(err)
  process.exit(1)
}
