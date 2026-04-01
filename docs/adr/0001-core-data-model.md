# ADR-0001: Core Data Model

**Status:** Proposed — awaiting CEO sign-off
**Date:** 2026-04-02
**Author:** Founding Engineer

---

## Context

We are building a data management platform. Before writing a single line of
product code we must answer: **what is the primary entity?**

This decision shapes the entire schema, API surface, and mental model users
will carry for years. Getting it wrong means rework at the worst time.

### Options considered

| Option | Description | Pros | Cons |
|--------|-------------|------|------|
| **Dataset** | A named, versioned, tabular object (rows + typed columns) | Matches user mental model; clear unit of ownership; composable | "Dataset" feels technical to non-data users |
| Collection | A folder grouping other entities | Flexible hierarchy | Not a primary entity; a container, not data |
| Project | A workspace containing multiple things | Familiar word | Overloaded (we use "project" for Paperclip tasks); ambiguous scope |
| Table | Database-like framing | Precise for power users | Too technical for broader market; implies SQL-only |

---

## Decision

**The primary entity is a `Dataset`.**

A Dataset is a named, versioned, tabular collection of data with:
- A defined schema (column names + types)
- Rows of data conforming to that schema
- Metadata (name, description, tags, created/updated timestamps)
- An owner (user or team)
- A source (uploaded file, API sync, manual entry)

Datasets are organized into **Collections** (folders/workspaces). A Collection
is a secondary entity — it exists to group Datasets, nothing more.

### Why Dataset wins

1. **User intent maps directly.** When users say "I want to manage my data,"
   they mean "I have files/tables of data I want to organize and query." A
   Dataset is exactly that unit.

2. **Clear ownership and versioning.** Every mutation can be tracked as a
   Dataset version. Users can roll back, diff, and audit changes at the
   Dataset level — not at some coarser or finer granularity.

3. **Composable.** You can join Datasets, transform Datasets into new Datasets,
   export a Dataset to CSV/JSON/Parquet. The unit of composition is clear.

4. **Industry precedent.** Kaggle, Hugging Face, Databricks, and every serious
   data platform calls this a Dataset (or "table" in SQL contexts). We should
   not fight vocabulary.

---

## Schema

### `datasets` table

```sql
CREATE TABLE datasets (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id UUID REFERENCES collections(id) ON DELETE SET NULL,
  owner_id    UUID NOT NULL REFERENCES users(id),
  name        TEXT NOT NULL,
  description TEXT,
  slug        TEXT NOT NULL,                          -- URL-safe name within collection
  row_count   INTEGER NOT NULL DEFAULT 0,
  schema      JSONB NOT NULL DEFAULT '[]',             -- DatasetColumn[]
  source_kind TEXT NOT NULL DEFAULT 'upload',          -- 'upload' | 'api' | 'manual'
  source_meta JSONB,                                   -- flexible: original filename, url, etc.
  tags        TEXT[] NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(collection_id, slug)
);
```

### `collections` table

```sql
CREATE TABLE collections (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id    UUID NOT NULL REFERENCES users(id),
  name        TEXT NOT NULL,
  description TEXT,
  slug        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(owner_id, slug)
);
```

### `dataset_rows` table

```sql
CREATE TABLE dataset_rows (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dataset_id  UUID NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
  position    INTEGER NOT NULL,                        -- display order
  data        JSONB NOT NULL,                          -- { [columnId]: value }
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ON dataset_rows(dataset_id, position);
```

### `users` table (minimal for v0)

```sql
CREATE TABLE users (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email      TEXT NOT NULL UNIQUE,
  name       TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### Column schema type (stored in `datasets.schema` JSONB)

```typescript
type ColumnType = 'text' | 'number' | 'boolean' | 'date' | 'url'

interface DatasetColumn {
  id: string       // stable UUID, never changes even if name changes
  name: string     // display name
  type: ColumnType
  required: boolean
  description?: string
}
```

---

## Storage strategy for v0

**Row storage: JSONB in PostgreSQL.**

For v0 with small datasets (< 100K rows), storing rows as JSONB in Postgres is
correct. It avoids the complexity of a columnar store while being fast enough
for filtering, sorting, and export.

When we hit scaling limits (large datasets, complex aggregations), we migrate to
a columnar approach (DuckDB for analytics, Parquet files on S3). That's a v2
problem.

---

## What this is NOT (scope guard)

- Not a query engine (no SQL interface in v0)
- Not a real-time sync system (no websockets, no CDC in v0)
- Not multi-tenant at the row level (no row-level security in v0)
- Not a BI tool (no charts, dashboards in v0)

---

## Consequences

- API routes will be namespaced as `/api/v1/datasets` and `/api/v1/collections`
- All future features (import, export, query, transform) operate on Dataset entities
- Schema evolution (adding/renaming columns) must be handled at the Dataset level
- URL structure: `/{collection-slug}/{dataset-slug}`

---

## Sign-off required

**CEO:** Please review and comment on [IDM-3](/IDM/issues/IDM-3). Specifically:
- Does "Dataset" resonate with the target user persona we have in mind?
- Any concerns about the JSONB row storage approach for v0?
- Approved to proceed to implementation (IDM-4)?
