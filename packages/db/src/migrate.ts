import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import postgres from 'postgres'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { users } from './schema.js'

const MIGRATIONS_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'migrations')

// The system owner ID used across all v0 data (no auth yet).
// Must match SYSTEM_OWNER_ID in apps/api/src/routes/datasets.ts
export const SYSTEM_OWNER_ID = '00000000-0000-0000-0000-000000000001'

export async function runMigrations(connectionString: string) {
  // Use a dedicated connection for migrations (migrate() must use a non-pooling client)
  const client = postgres(connectionString, { max: 1 })
  const db = drizzle(client)

  await migrate(db, { migrationsFolder: MIGRATIONS_DIR })

  // Seed the system owner if it doesn't exist yet
  await db
    .insert(users)
    .values({
      id: SYSTEM_OWNER_ID as unknown as string,
      email: 'system@datamanager.local',
      name: 'System',
    })
    .onConflictDoNothing()

  await client.end()
}
