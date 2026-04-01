import { useEffect, useState } from 'react'

type ApiStatus = {
  service: string
  status: string
  timestamp: string
}

export default function App() {
  const [apiStatus, setApiStatus] = useState<ApiStatus | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/v1/status')
      .then((r) => r.json())
      .then(setApiStatus)
      .catch((e) => setError(String(e)))
  }, [])

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', maxWidth: 800, margin: '0 auto', padding: 32 }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>DataManager</h1>
      <p style={{ color: '#666', marginBottom: 32 }}>The number one data manager</p>

      <div
        style={{
          border: '1px solid #e5e7eb',
          borderRadius: 8,
          padding: 24,
          background: '#f9fafb',
        }}
      >
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>API Status</h2>
        {error && <p style={{ color: '#dc2626' }}>Error: {error}</p>}
        {apiStatus ? (
          <pre style={{ fontSize: 13, color: '#374151' }}>{JSON.stringify(apiStatus, null, 2)}</pre>
        ) : (
          <p style={{ color: '#9ca3af' }}>Connecting to API...</p>
        )}
      </div>
    </div>
  )
}
