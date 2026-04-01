import { useState, useEffect, useRef, useCallback } from 'react'
import { api, type Dataset, type DatasetRow, type DatasetColumn } from './api'

// ─────────────────────────────────────────────
// Styles (minimal, no deps)
// ─────────────────────────────────────────────

const S = {
  app: {
    fontFamily: 'system-ui, -apple-system, sans-serif',
    background: '#f8fafc',
    minHeight: '100vh',
    color: '#0f172a',
  } as React.CSSProperties,

  header: {
    background: '#fff',
    borderBottom: '1px solid #e2e8f0',
    padding: '0 24px',
    height: 52,
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  } as React.CSSProperties,

  logo: { fontWeight: 700, fontSize: 16, letterSpacing: '-0.02em' } as React.CSSProperties,

  main: { maxWidth: 1100, margin: '0 auto', padding: '32px 24px' } as React.CSSProperties,

  btn: (variant: 'primary' | 'ghost' | 'danger') =>
    ({
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      padding: '7px 14px',
      borderRadius: 6,
      fontSize: 13,
      fontWeight: 500,
      cursor: 'pointer',
      border: 'none',
      transition: 'background 0.1s',
      background: variant === 'primary' ? '#3b82f6' : variant === 'danger' ? '#fee2e2' : '#f1f5f9',
      color: variant === 'primary' ? '#fff' : variant === 'danger' ? '#dc2626' : '#334155',
    }) as React.CSSProperties,

  card: {
    background: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: 10,
    padding: 20,
  } as React.CSSProperties,

  input: {
    width: '100%',
    border: '1px solid #e2e8f0',
    borderRadius: 6,
    padding: '8px 12px',
    fontSize: 14,
    outline: 'none',
    boxSizing: 'border-box',
  } as React.CSSProperties,

  badge: (color: string) =>
    ({
      display: 'inline-block',
      padding: '2px 8px',
      borderRadius: 12,
      fontSize: 11,
      fontWeight: 600,
      background: color,
      color: '#fff',
    }) as React.CSSProperties,
}

// ─────────────────────────────────────────────
// DatasetListView
// ─────────────────────────────────────────────

function DatasetListView({ onOpen }: { onOpen: (d: Dataset) => void }) {
  const [datasets, setDatasets] = useState<Dataset[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.listDatasets()
      setDatasets(res.datasets)
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName.trim()) return
    try {
      const res = await api.createDataset({ name: newName.trim(), description: newDesc.trim() || undefined })
      setDatasets((prev) => [res.dataset, ...prev])
      setCreating(false)
      setNewName('')
      setNewDesc('')
    } catch (e) {
      setError(String(e))
    }
  }

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('Delete this dataset? This cannot be undone.')) return
    try {
      await api.deleteDataset(id)
      setDatasets((prev) => prev.filter((d) => d.id !== id))
    } catch (e) {
      setError(String(e))
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 24, gap: 12 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, flex: 1, margin: 0 }}>Datasets</h1>
        <button style={S.btn('primary')} onClick={() => setCreating(true)}>
          + New Dataset
        </button>
      </div>

      {error && (
        <div style={{ background: '#fee2e2', color: '#dc2626', padding: '10px 14px', borderRadius: 6, marginBottom: 16, fontSize: 13 }}>
          {error}
        </div>
      )}

      {creating && (
        <div style={{ ...S.card, marginBottom: 20 }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 600 }}>New Dataset</h3>
          <form onSubmit={handleCreate}>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4, color: '#64748b' }}>NAME *</label>
              <input
                style={S.input}
                placeholder="My Dataset"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                autoFocus
              />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4, color: '#64748b' }}>DESCRIPTION</label>
              <input
                style={S.input}
                placeholder="Optional description"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
              />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="submit" style={S.btn('primary')}>Create</button>
              <button type="button" style={S.btn('ghost')} onClick={() => setCreating(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <p style={{ color: '#94a3b8', fontSize: 14 }}>Loading…</p>
      ) : datasets.length === 0 ? (
        <div style={{ ...S.card, textAlign: 'center', padding: '48px 24px', color: '#94a3b8' }}>
          <p style={{ fontSize: 15, marginBottom: 8 }}>No datasets yet</p>
          <p style={{ fontSize: 13 }}>Create one and upload a CSV or JSON file to get started.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {datasets.map((d) => (
            <div
              key={d.id}
              style={{ ...S.card, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 16 }}
              onClick={() => onOpen(d)}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }}>{d.name}</div>
                {d.description && (
                  <div style={{ fontSize: 13, color: '#64748b', marginBottom: 4 }}>{d.description}</div>
                )}
                <div style={{ fontSize: 12, color: '#94a3b8' }}>
                  {d.rowCount.toLocaleString()} rows · {d.schema.length} columns · {d.sourceKind}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                {d.tags.map((t) => (
                  <span key={t} style={{ ...S.badge('#6366f1') }}>{t}</span>
                ))}
                <button
                  style={S.btn('danger')}
                  onClick={(e) => handleDelete(d.id, e)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────
// DatasetDetailView
// ─────────────────────────────────────────────

const PAGE_SIZE = 100

function DatasetDetailView({ dataset: initial, onBack }: { dataset: Dataset; onBack: () => void }) {
  const [dataset, setDataset] = useState(initial)
  const [rows, setRows] = useState<DatasetRow[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [sortBy, setSortBy] = useState<string | undefined>()
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [filters, setFilters] = useState<Record<string, string>>({})
  const [filterOpen, setFilterOpen] = useState(false)
  const [loadingRows, setLoadingRows] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState(dataset.name)
  const [editDesc, setEditDesc] = useState(dataset.description ?? '')
  const [editTagsRaw, setEditTagsRaw] = useState(dataset.tags.join(', '))
  const [editError, setEditError] = useState<string | null>(null)
  const [addingRow, setAddingRow] = useState(false)
  const [newRowData, setNewRowData] = useState<Record<string, string>>({})
  const [addRowError, setAddRowError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const schema: DatasetColumn[] = dataset.schema

  const fetchRows = useCallback(async (
    p: number,
    sb?: string,
    sd?: 'asc' | 'desc',
    f?: Record<string, string>,
  ) => {
    setLoadingRows(true)
    try {
      const res = await api.getRows(dataset.id, { page: p, limit: PAGE_SIZE, sortBy: sb, sortDir: sd, filters: f })
      setRows(res.rows)
      setTotal(res.total)
    } finally {
      setLoadingRows(false)
    }
  }, [dataset.id])

  useEffect(() => { fetchRows(page, sortBy, sortDir, filters) }, [fetchRows, page, sortBy, sortDir, filters])

  const handleSort = (colId: string) => {
    if (sortBy === colId) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortBy(colId)
      setSortDir('asc')
    }
    setPage(1)
  }

  const handleFilterChange = (colId: string, value: string) => {
    setFilters((prev) => {
      const next = { ...prev }
      if (value) next[colId] = value
      else delete next[colId]
      return next
    })
    setPage(1)
  }

  const clearFilters = () => {
    setFilters({})
    setPage(1)
  }

  const activeFilterCount = Object.values(filters).filter(Boolean).length

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setUploadError(null)
    try {
      const res = await api.uploadFile(dataset.id, file)
      setDataset(res.dataset)
      setPage(1)
      setFilters({})
      await fetchRows(1, sortBy, sortDir, {})
    } catch (err) {
      setUploadError(String(err))
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const handleEditSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editName.trim()) return
    setEditError(null)
    try {
      const tags = editTagsRaw.split(',').map((t) => t.trim()).filter(Boolean)
      const res = await api.updateDataset(dataset.id, {
        name: editName.trim(),
        description: editDesc.trim() || null,
        tags,
      })
      setDataset(res.dataset)
      setEditing(false)
    } catch (err) {
      setEditError(String(err))
    }
  }

  const handleAddRow = async (e: React.FormEvent) => {
    e.preventDefault()
    setAddRowError(null)
    try {
      const data: Record<string, unknown> = {}
      for (const col of schema) {
        const raw = newRowData[col.id] ?? ''
        data[col.id] = raw === '' ? null : raw
      }
      await api.addRow(dataset.id, data)
      setNewRowData({})
      setAddingRow(false)
      // Refresh rows and update local rowCount
      setDataset((d) => ({ ...d, rowCount: d.rowCount + 1 }))
      await fetchRows(page, sortBy, sortDir, filters)
    } catch (err) {
      setAddRowError(String(err))
    }
  }

  const handleDeleteRow = async (rowId: string) => {
    if (!confirm('Delete this row?')) return
    try {
      await api.deleteRow(dataset.id, rowId)
      setDataset((d) => ({ ...d, rowCount: Math.max(0, d.rowCount - 1) }))
      await fetchRows(page, sortBy, sortDir, filters)
    } catch (err) {
      setUploadError(String(err))
    }
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  const typeColor: Record<string, string> = {
    text: '#94a3b8',
    number: '#3b82f6',
    boolean: '#10b981',
    date: '#f59e0b',
    url: '#8b5cf6',
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: 24, gap: 12 }}>
        <button style={S.btn('ghost')} onClick={onBack}>← Back</button>
        <div style={{ flex: 1 }}>
          {editing ? (
            <form onSubmit={handleEditSave}>
              <div style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                <input
                  style={{ ...S.input, fontSize: 18, fontWeight: 700, width: 280 }}
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  autoFocus
                />
                <button type="submit" style={S.btn('primary')}>Save</button>
                <button type="button" style={S.btn('ghost')} onClick={() => { setEditing(false); setEditName(dataset.name); setEditDesc(dataset.description ?? ''); setEditTagsRaw(dataset.tags.join(', ')) }}>Cancel</button>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <input
                  style={{ ...S.input, fontSize: 13, color: '#64748b', width: 260 }}
                  placeholder="Description (optional)"
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                />
                <input
                  style={{ ...S.input, fontSize: 13, color: '#64748b', width: 200 }}
                  placeholder="Tags (comma-separated)"
                  value={editTagsRaw}
                  onChange={(e) => setEditTagsRaw(e.target.value)}
                />
              </div>
              {editError && <p style={{ color: '#dc2626', fontSize: 12, margin: '4px 0 0' }}>{editError}</p>}
            </form>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h1 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 4px' }}>{dataset.name}</h1>
                <button style={{ ...S.btn('ghost'), padding: '3px 8px', fontSize: 12 }} onClick={() => setEditing(true)}>Edit</button>
              </div>
              {dataset.description && (
                <p style={{ color: '#64748b', fontSize: 14, margin: 0 }}>{dataset.description}</p>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                <span style={{ color: '#94a3b8', fontSize: 12 }}>
                  {total.toLocaleString()} rows · {schema.length} columns
                </span>
                {dataset.tags.map((t) => (
                  <span key={t} style={{ ...S.badge('#6366f1') }}>{t}</span>
                ))}
              </div>
            </>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {schema.length > 0 && (
            <button
              style={{ ...S.btn(activeFilterCount > 0 ? 'primary' : 'ghost') }}
              onClick={() => setFilterOpen((o) => !o)}
            >
              {activeFilterCount > 0 ? `Filter (${activeFilterCount})` : 'Filter'}
            </button>
          )}
          <a
            href={api.exportUrl(dataset.id, 'csv')}
            style={{ ...S.btn('ghost'), textDecoration: 'none' }}
            download
          >
            Export CSV
          </a>
          <a
            href={api.exportUrl(dataset.id, 'json')}
            style={{ ...S.btn('ghost'), textDecoration: 'none' }}
            download
          >
            Export JSON
          </a>
          {schema.length > 0 && (
            <button style={S.btn('primary')} onClick={() => { setAddingRow(true); setNewRowData({}); setAddRowError(null) }}>
              + Add Row
            </button>
          )}
          <label style={{ ...S.btn('ghost'), cursor: 'pointer' }}>
            {uploading ? 'Uploading…' : 'Upload File'}
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.json,.ndjson"
              style={{ display: 'none' }}
              onChange={handleUpload}
              disabled={uploading}
            />
          </label>
        </div>
      </div>

      {uploadError && (
        <div style={{ background: '#fee2e2', color: '#dc2626', padding: '10px 14px', borderRadius: 6, marginBottom: 16, fontSize: 13 }}>
          Upload error: {uploadError}
        </div>
      )}

      {/* Filter bar */}
      {filterOpen && schema.length > 0 && (
        <div style={{ ...S.card, marginBottom: 16, padding: '14px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>Filter rows</span>
            {activeFilterCount > 0 && (
              <button style={{ ...S.btn('ghost'), padding: '3px 8px', fontSize: 12 }} onClick={clearFilters}>Clear all</button>
            )}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8 }}>
            {schema.map((col) => (
              <div key={col.id}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#94a3b8', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: 1, background: typeColor[col.type] ?? '#94a3b8', marginRight: 4 }} />
                  {col.name}
                </label>
                <input
                  style={{ ...S.input, fontSize: 13 }}
                  placeholder={`Filter ${col.name}…`}
                  value={filters[col.id] ?? ''}
                  onChange={(e) => handleFilterChange(col.id, e.target.value)}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add row form */}
      {addingRow && schema.length > 0 && (
        <div style={{ ...S.card, marginBottom: 16, padding: '14px 16px' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 10 }}>New Row</div>
          <form onSubmit={handleAddRow}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8, marginBottom: 12 }}>
              {schema.map((col) => (
                <div key={col.id}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#94a3b8', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: 1, background: typeColor[col.type] ?? '#94a3b8', marginRight: 4 }} />
                    {col.name}
                  </label>
                  <input
                    style={{ ...S.input, fontSize: 13 }}
                    placeholder={col.type}
                    value={newRowData[col.id] ?? ''}
                    onChange={(e) => setNewRowData((prev) => ({ ...prev, [col.id]: e.target.value }))}
                  />
                </div>
              ))}
            </div>
            {addRowError && <p style={{ color: '#dc2626', fontSize: 12, margin: '0 0 8px' }}>{addRowError}</p>}
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="submit" style={S.btn('primary')}>Save Row</button>
              <button type="button" style={S.btn('ghost')} onClick={() => { setAddingRow(false); setAddRowError(null) }}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {schema.length === 0 ? (
        <div style={{ ...S.card, textAlign: 'center', padding: '48px 24px', color: '#94a3b8' }}>
          <p style={{ fontSize: 15, marginBottom: 8 }}>No data yet</p>
          <p style={{ fontSize: 13 }}>Upload a .csv or .json file to import data.</p>
        </div>
      ) : (
        <>
          {/* Column legend */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
            {schema.map((col) => (
              <span key={col.id} style={{ fontSize: 12, color: '#64748b' }}>
                <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: typeColor[col.type] ?? '#94a3b8', marginRight: 4 }} />
                {col.name}
                <span style={{ color: '#cbd5e1', marginLeft: 4 }}>{col.type}</span>
              </span>
            ))}
          </div>

          {/* Table */}
          <div style={{ ...S.card, padding: 0, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#f8fafc' }}>
                    <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: '#64748b', borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap', width: 48 }}>#</th>
                    {schema.map((col) => (
                      <th
                        key={col.id}
                        style={{
                          padding: '10px 12px',
                          textAlign: 'left',
                          fontWeight: 600,
                          color: '#64748b',
                          borderBottom: '1px solid #e2e8f0',
                          whiteSpace: 'nowrap',
                          cursor: 'pointer',
                          userSelect: 'none',
                        }}
                        onClick={() => handleSort(col.id)}
                      >
                        <span style={{ borderBottom: `2px solid ${typeColor[col.type] ?? '#94a3b8'}`, paddingBottom: 1 }}>
                          {col.name}
                        </span>
                        {sortBy === col.id && (
                          <span style={{ marginLeft: 4 }}>{sortDir === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </th>
                    ))}
                    <th style={{ padding: '10px 12px', borderBottom: '1px solid #e2e8f0', width: 36 }} />
                  </tr>
                </thead>
                <tbody>
                  {loadingRows ? (
                    <tr>
                      <td colSpan={schema.length + 1} style={{ padding: 24, textAlign: 'center', color: '#94a3b8' }}>
                        Loading…
                      </td>
                    </tr>
                  ) : rows.map((row) => (
                    <tr key={row.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '7px 12px', color: '#cbd5e1', fontVariantNumeric: 'tabular-nums' }}>
                        {row.position + 1}
                      </td>
                      {schema.map((col) => {
                        const val = (row.data as Record<string, unknown>)[col.id]
                        return (
                          <td key={col.id} style={{ padding: '7px 12px', color: '#334155', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {col.type === 'url' && typeof val === 'string' ? (
                              <a href={val} target="_blank" rel="noreferrer" style={{ color: '#3b82f6' }}>
                                {val}
                              </a>
                            ) : val === null || val === undefined ? (
                              <span style={{ color: '#cbd5e1' }}>—</span>
                            ) : (
                              String(val)
                            )}
                          </td>
                        )
                      })}
                      <td style={{ padding: '4px 8px' }}>
                        <button
                          style={{ ...S.btn('danger'), padding: '3px 6px', fontSize: 11 }}
                          onClick={() => handleDeleteRow(row.id)}
                          title="Delete row"
                        >
                          ×
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', borderTop: '1px solid #e2e8f0', fontSize: 13 }}>
                <button
                  style={S.btn('ghost')}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  ← Prev
                </button>
                <span style={{ color: '#64748b' }}>
                  Page {page} of {totalPages} ({total.toLocaleString()} rows)
                </span>
                <button
                  style={S.btn('ghost')}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  Next →
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────
// App root
// ─────────────────────────────────────────────

export default function App() {
  const [view, setView] = useState<{ page: 'list' } | { page: 'detail'; dataset: Dataset }>({ page: 'list' })

  return (
    <div style={S.app}>
      <header style={S.header}>
        <span style={S.logo} onClick={() => setView({ page: 'list' })} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && setView({ page: 'list' })}>
          DataManager
        </span>
        <span style={{ color: '#e2e8f0' }}>|</span>
        <span style={{ fontSize: 13, color: '#64748b' }}>
          {view.page === 'detail' ? view.dataset.name : 'Datasets'}
        </span>
      </header>
      <main style={S.main}>
        {view.page === 'list' ? (
          <DatasetListView onOpen={(d) => setView({ page: 'detail', dataset: d })} />
        ) : (
          <DatasetDetailView
            dataset={view.dataset}
            onBack={() => setView({ page: 'list' })}
          />
        )}
      </main>
    </div>
  )
}
