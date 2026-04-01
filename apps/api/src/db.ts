import fp from 'fastify-plugin'
import { createDb, type Db } from '@datamanager/db'
import type { FastifyInstance } from 'fastify'

declare module 'fastify' {
  interface FastifyInstance {
    db: Db
  }
}

export default fp(async function dbPlugin(app: FastifyInstance) {
  const url = process.env.DATABASE_URL ?? 'postgresql://localhost:5432/datamanager'
  const db = createDb(url)
  app.decorate('db', db)
})
