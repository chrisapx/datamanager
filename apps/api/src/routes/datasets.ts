import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { eq, desc, asc, and, sql } from 'drizzle-orm'
import { datasets, datasetRows, SYSTEM_OWNER_ID } from '@datamanager/db'
import type { DatasetColumn } from '@datamanager/db'
import { parse as csvParse } from 'csv-parse/sync'

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function inferColumnType(values: unknown[]): DatasetColumn['type'] {
  const nonEmpty = values.filter((v) => v !== null && v !== undefined && v !== '')
  if (nonEmpty.length === 0) return 'text'

  const allNumbers = nonEmpty.every((v) => !isNaN(Number(v)))
  if (allNumbers) return 'number'

  const boolSet = new Set(['true', 'false', '1', '0', 'yes', 'no'])
  const allBools = nonEmpty.every((v) => boolSet.has(String(v).toLowerCase()))
  if (allBools) return 'boolean'

  const allDates = nonEmpty.every((v) => !isNaN(Date.parse(String(v))))
  if (allDates) return 'date'

  const urlPattern = /^https?:\/\//i
  const allUrls = nonEmpty.every((v) => urlPattern.test(String(v)))
  if (allUrls) return 'url'

  return 'text'
}

function buildSchema(headers: string[], rows: Record<string, unknown>[]): DatasetColumn[] {
  return headers.map((name, i) => {
    const id = `col_${i}`
    const values = rows.map((r) => r[name])
    return {
      id,
      name,
      type: inferColumnType(values),
      required: false,
    }
  })
}

// ─────────────────────────────────────────────
// Validation schemas
// ─────────────────────────────────────────────

const CreateDatasetBody = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
  collectionId: z.string().uuid().optional(),
})

const UpdateDatasetBody = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().nullable().optional(),
  tags: z.array(z.string()).optional(),
}).refine((d) => Object.keys(d).length > 0, { message: 'At least one field required' })

const QueryRowsParams = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(1000).default(100),
  sortBy: z.string().optional(),
  sortDir: z.enum(['asc', 'desc']).default('asc'),
  // filter: one or more column:value pairs, e.g. ?filter=col_0:active&filter=col_1:true
  // A single value comes in as a string; multiple values as an array.
  filter: z.union([z.string(), z.array(z.string())]).optional().transform((v) => {
    if (!v) return []
    return (Array.isArray(v) ? v : [v]).flatMap((entry) => {
      const idx = entry.indexOf(':')
      if (idx === -1) return []
      const colId = entry.slice(0, idx).trim()
      const value = entry.slice(idx + 1)
      return colId ? [{ colId, value }] : []
    })
  }),
})

// ─────────────────────────────────────────────
// Routes
// ─────────────────────────────────────────────

export default async function datasetRoutes(app: FastifyInstance) {
  // ── GET /api/v1/datasets ─────────────────────
  app.get('/api/v1/datasets', async (_req, reply) => {
    const rows = await app.db
      .select()
      .from(datasets)
      .where(eq(datasets.ownerId, SYSTEM_OWNER_ID))
      .orderBy(desc(datasets.createdAt))

    return reply.send({ datasets: rows })
  })

  // ── GET /api/v1/datasets/:id ─────────────────
  app.get<{ Params: { id: string } }>('/api/v1/datasets/:id', async (req, reply) => {
    const { id } = req.params
    const [dataset] = await app.db
      .select()
      .from(datasets)
      .where(and(eq(datasets.id, id), eq(datasets.ownerId, SYSTEM_OWNER_ID)))
      .limit(1)

    if (!dataset) return reply.status(404).send({ error: 'Dataset not found' })
    return reply.send({ dataset })
  })

  // ── POST /api/v1/datasets ────────────────────
  app.post('/api/v1/datasets', async (req, reply) => {
    const body = CreateDatasetBody.safeParse(req.body)
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() })

    const { name, description, tags, collectionId } = body.data
    const slug = slugify(name)

    const [dataset] = await app.db
      .insert(datasets)
      .values({
        name,
        description,
        slug,
        tags: tags ?? [],
        collectionId: collectionId ?? null,
        ownerId: SYSTEM_OWNER_ID,
        sourceKind: 'manual',
      })
      .returning()

    return reply.status(201).send({ dataset })
  })

  // ── PATCH /api/v1/datasets/:id ───────────────
  app.patch<{ Params: { id: string } }>('/api/v1/datasets/:id', async (req, reply) => {
    const { id } = req.params
    const body = UpdateDatasetBody.safeParse(req.body)
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() })

    const { name, description, tags } = body.data
    const updates: Record<string, unknown> = { updatedAt: new Date() }
    if (name !== undefined) {
      updates.name = name
      updates.slug = slugify(name)
    }
    if (description !== undefined) updates.description = description
    if (tags !== undefined) updates.tags = tags

    const [updated] = await app.db
      .update(datasets)
      .set(updates)
      .where(and(eq(datasets.id, id), eq(datasets.ownerId, SYSTEM_OWNER_ID)))
      .returning()

    if (!updated) return reply.status(404).send({ error: 'Dataset not found' })
    return reply.send({ dataset: updated })
  })

  // ── DELETE /api/v1/datasets/:id ──────────────
  app.delete<{ Params: { id: string } }>('/api/v1/datasets/:id', async (req, reply) => {
    const { id } = req.params
    const [deleted] = await app.db
      .delete(datasets)
      .where(and(eq(datasets.id, id), eq(datasets.ownerId, SYSTEM_OWNER_ID)))
      .returning({ id: datasets.id })

    if (!deleted) return reply.status(404).send({ error: 'Dataset not found' })
    return reply.status(204).send()
  })

  // ── GET /api/v1/datasets/:id/rows ────────────
  app.get<{ Params: { id: string }; Querystring: Record<string, string> }>(
    '/api/v1/datasets/:id/rows',
    async (req, reply) => {
      const { id } = req.params
      const query = QueryRowsParams.safeParse(req.query)
      if (!query.success) return reply.status(400).send({ error: query.error.flatten() })

      const { page, limit, sortBy, sortDir, filter } = query.data

      // Verify dataset exists and belongs to owner
      const [dataset] = await app.db
        .select()
        .from(datasets)
        .where(and(eq(datasets.id, id), eq(datasets.ownerId, SYSTEM_OWNER_ID)))
        .limit(1)

      if (!dataset) return reply.status(404).send({ error: 'Dataset not found' })

      const offset = (page - 1) * limit

      // Build WHERE conditions — start with dataset match, then add column filters
      const conditions = [eq(datasetRows.datasetId, id)]
      for (const { colId, value } of filter) {
        // Case-insensitive substring match on the JSONB text value
        conditions.push(sql`lower(data->>${colId}) like ${'%' + value.toLowerCase() + '%'}`)
      }

      // Base query
      let rowsQuery = app.db
        .select()
        .from(datasetRows)
        .where(and(...conditions))

      // Apply ordering
      if (sortBy) {
        const dir = sortDir === 'desc' ? desc : asc
        rowsQuery = rowsQuery.orderBy(dir(sql`data->>${sortBy}`)) as typeof rowsQuery
      } else {
        rowsQuery = rowsQuery.orderBy(asc(datasetRows.position)) as typeof rowsQuery
      }

      const rows = await rowsQuery.offset(offset).limit(limit)

      // When filters are active, count filtered rows; otherwise use cached rowCount
      let total = dataset.rowCount
      if (filter.length > 0) {
        const [countRow] = await app.db
          .select({ count: sql<number>`count(*)::int` })
          .from(datasetRows)
          .where(and(...conditions))
        total = countRow?.count ?? 0
      }

      return reply.send({
        rows: rows.map((r) => ({ id: r.id, position: r.position, data: r.data })),
        total,
        page,
        limit,
      })
    }
  )

  // ── POST /api/v1/datasets/:id/upload ─────────
  // Accepts multipart/form-data with a file field named "file"
  // Supports CSV and JSON
  app.post<{ Params: { id: string } }>(
    '/api/v1/datasets/:id/upload',
    async (req, reply) => {
      const { id } = req.params

      const [dataset] = await app.db
        .select()
        .from(datasets)
        .where(and(eq(datasets.id, id), eq(datasets.ownerId, SYSTEM_OWNER_ID)))
        .limit(1)

      if (!dataset) return reply.status(404).send({ error: 'Dataset not found' })

      const data = await req.file()
      if (!data) return reply.status(400).send({ error: 'No file uploaded' })

      const filename = data.filename.toLowerCase()
      const buffer = await data.toBuffer()
      const text = buffer.toString('utf-8')

      let headers: string[]
      let rawRows: Record<string, unknown>[]

      if (filename.endsWith('.csv')) {
        const parsed = csvParse(text, { columns: true, skip_empty_lines: true, trim: true }) as Record<string, unknown>[]
        if (parsed.length === 0) return reply.status(400).send({ error: 'CSV file is empty' })
        headers = Object.keys(parsed[0])
        rawRows = parsed
      } else if (filename.endsWith('.json') || filename.endsWith('.ndjson')) {
        const parsed: unknown = filename.endsWith('.ndjson')
          ? text
              .split('\n')
              .filter((l) => l.trim())
              .map((l) => JSON.parse(l))
          : JSON.parse(text)

        if (!Array.isArray(parsed)) return reply.status(400).send({ error: 'JSON file must contain an array of objects' })
        if (parsed.length === 0) return reply.status(400).send({ error: 'JSON file is empty' })
        headers = Object.keys(parsed[0] as Record<string, unknown>)
        rawRows = parsed as Record<string, unknown>[]
      } else {
        return reply.status(400).send({ error: 'Unsupported file type. Use .csv or .json' })
      }

      const schema = buildSchema(headers, rawRows)

      // Map column names → column IDs for storage
      const nameToId = Object.fromEntries(schema.map((c) => [c.name, c.id]))

      const rowValues = rawRows.map((row, i) => ({
        datasetId: id,
        position: i,
        data: Object.fromEntries(
          Object.entries(row).map(([k, v]) => [nameToId[k] ?? k, v])
        ),
      }))

      // Clear existing rows, insert new ones, update schema + count
      await app.db.delete(datasetRows).where(eq(datasetRows.datasetId, id))

      const BATCH = 500
      for (let i = 0; i < rowValues.length; i += BATCH) {
        await app.db.insert(datasetRows).values(rowValues.slice(i, i + BATCH))
      }

      const [updated] = await app.db
        .update(datasets)
        .set({
          schema,
          rowCount: rawRows.length,
          sourceKind: 'upload',
          sourceMeta: { filename: data.filename },
          updatedAt: new Date(),
        })
        .where(eq(datasets.id, id))
        .returning()

      return reply.send({ dataset: updated, rowsImported: rawRows.length })
    }
  )

  // ── GET /api/v1/datasets/:id/export ──────────
  app.get<{ Params: { id: string }; Querystring: { format?: string } }>(
    '/api/v1/datasets/:id/export',
    async (req, reply) => {
      const { id } = req.params
      const format = (req.query.format ?? 'json').toLowerCase()

      const [dataset] = await app.db
        .select()
        .from(datasets)
        .where(and(eq(datasets.id, id), eq(datasets.ownerId, SYSTEM_OWNER_ID)))
        .limit(1)

      if (!dataset) return reply.status(404).send({ error: 'Dataset not found' })

      const rows = await app.db
        .select()
        .from(datasetRows)
        .where(eq(datasetRows.datasetId, id))
        .orderBy(asc(datasetRows.position))

      // Map column IDs back to names
      const schema = dataset.schema as DatasetColumn[]
      const idToName = Object.fromEntries(schema.map((c) => [c.id, c.name]))

      const namedRows = rows.map((r) =>
        Object.fromEntries(
          Object.entries(r.data as Record<string, unknown>).map(([k, v]) => [idToName[k] ?? k, v])
        )
      )

      if (format === 'csv') {
        if (namedRows.length === 0) {
          reply.header('Content-Type', 'text/csv')
          reply.header('Content-Disposition', `attachment; filename="${dataset.slug}.csv"`)
          return reply.send(schema.map((c) => c.name).join(',') + '\n')
        }

        const headers = Object.keys(namedRows[0])
        const csvLines = [
          headers.map((h) => `"${String(h).replace(/"/g, '""')}"`).join(','),
          ...namedRows.map((row) =>
            headers
              .map((h) => {
                const val = row[h]
                if (val === null || val === undefined) return ''
                const s = String(val)
                if (s.includes(',') || s.includes('"') || s.includes('\n')) {
                  return `"${s.replace(/"/g, '""')}"`
                }
                return s
              })
              .join(',')
          ),
        ]

        reply.header('Content-Type', 'text/csv')
        reply.header('Content-Disposition', `attachment; filename="${dataset.slug}.csv"`)
        return reply.send(csvLines.join('\n'))
      }

      // Default: JSON
      reply.header('Content-Type', 'application/json')
      reply.header('Content-Disposition', `attachment; filename="${dataset.slug}.json"`)
      return reply.send(JSON.stringify(namedRows, null, 2))
    }
  )
}
