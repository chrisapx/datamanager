import {
  pgTable,
  uuid,
  text,
  integer,
  jsonb,
  timestamp,
  unique,
} from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

// ─────────────────────────────────────────────
// Column schema type (stored in datasets.schema)
// ─────────────────────────────────────────────

export type ColumnType = 'text' | 'number' | 'boolean' | 'date' | 'url'

export interface DatasetColumn {
  id: string
  name: string
  type: ColumnType
  required: boolean
  description?: string
}

// ─────────────────────────────────────────────
// users
// ─────────────────────────────────────────────

export const users = pgTable('users', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  email: text('email').notNull().unique(),
  name: text('name'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

// ─────────────────────────────────────────────
// collections
// ─────────────────────────────────────────────

export const collections = pgTable(
  'collections',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    ownerId: uuid('owner_id')
      .notNull()
      .references(() => users.id),
    name: text('name').notNull(),
    description: text('description'),
    slug: text('slug').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique().on(t.ownerId, t.slug)]
)

// ─────────────────────────────────────────────
// datasets — the primary entity
// ─────────────────────────────────────────────

export const datasets = pgTable(
  'datasets',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    collectionId: uuid('collection_id').references(() => collections.id, {
      onDelete: 'set null',
    }),
    ownerId: uuid('owner_id')
      .notNull()
      .references(() => users.id),
    name: text('name').notNull(),
    description: text('description'),
    slug: text('slug').notNull(),
    rowCount: integer('row_count').notNull().default(0),
    // Array of DatasetColumn objects
    schema: jsonb('schema').notNull().default(sql`'[]'::jsonb`).$type<DatasetColumn[]>(),
    sourceKind: text('source_kind').notNull().default('upload'), // 'upload' | 'api' | 'manual'
    sourceMeta: jsonb('source_meta').$type<Record<string, unknown>>(),
    tags: text('tags').array().notNull().default(sql`'{}'::text[]`),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique().on(t.collectionId, t.slug)]
)

// ─────────────────────────────────────────────
// dataset_rows — actual data storage
// ─────────────────────────────────────────────

export const datasetRows = pgTable('dataset_rows', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  datasetId: uuid('dataset_id')
    .notNull()
    .references(() => datasets.id, { onDelete: 'cascade' }),
  position: integer('position').notNull(),
  // { [columnId: string]: string | number | boolean | null }
  data: jsonb('data').notNull().$type<Record<string, unknown>>(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})
