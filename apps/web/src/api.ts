// ─────────────────────────────────────────────
// Shared types
// ─────────────────────────────────────────────

export interface DatasetColumn {
  id: string
  name: string
  type: 'text' | 'number' | 'boolean' | 'date' | 'url'
  required: boolean
  description?: string
}

export interface Dataset {
  id: string
  name: string
  description: string | null
  slug: string
  rowCount: number
  schema: DatasetColumn[]
  sourceKind: string
  tags: string[]
  collectionId: string | null
  createdAt: string
  updatedAt: string
}

export interface DatasetRow {
  id: string
  position: number
  data: Record<string, unknown>
}

export interface RowsResponse {
  rows: DatasetRow[]
  total: number
  page: number
  limit: number
}

// ─────────────────────────────────────────────
// API client
// ─────────────────────────────────────────────

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, init)
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`)
  }
  if (res.status === 204) return undefined as unknown as T
  return res.json() as Promise<T>
}

export const api = {
  listDatasets: () => apiFetch<{ datasets: Dataset[] }>('/api/v1/datasets'),

  getDataset: (id: string) => apiFetch<{ dataset: Dataset }>(`/api/v1/datasets/${id}`),

  createDataset: (body: { name: string; description?: string; tags?: string[] }) =>
    apiFetch<{ dataset: Dataset }>('/api/v1/datasets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),

  deleteDataset: (id: string) =>
    apiFetch<void>(`/api/v1/datasets/${id}`, { method: 'DELETE' }),

  uploadFile: (id: string, file: File) => {
    const form = new FormData()
    form.append('file', file)
    return apiFetch<{ dataset: Dataset; rowsImported: number }>(
      `/api/v1/datasets/${id}/upload`,
      { method: 'POST', body: form }
    )
  },

  updateDataset: (id: string, body: { name?: string; description?: string | null; tags?: string[] }) =>
    apiFetch<{ dataset: Dataset }>(`/api/v1/datasets/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),

  getRows: (
    id: string,
    params: {
      page?: number
      limit?: number
      sortBy?: string
      sortDir?: 'asc' | 'desc'
      filters?: Record<string, string>
    }
  ) => {
    const q = new URLSearchParams()
    if (params.page) q.set('page', String(params.page))
    if (params.limit) q.set('limit', String(params.limit))
    if (params.sortBy) q.set('sortBy', params.sortBy)
    if (params.sortDir) q.set('sortDir', params.sortDir)
    if (params.filters) {
      for (const [colId, value] of Object.entries(params.filters)) {
        if (value) q.append('filter', `${colId}:${value}`)
      }
    }
    return apiFetch<RowsResponse>(`/api/v1/datasets/${id}/rows?${q}`)
  },

  exportUrl: (id: string, format: 'csv' | 'json') =>
    `/api/v1/datasets/${id}/export?format=${format}`,
}
