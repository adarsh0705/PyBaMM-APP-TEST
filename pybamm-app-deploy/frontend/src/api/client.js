const BASE = (import.meta.env.VITE_API_URL || 'http://localhost:8000') + '/api'

export async function runSimulation(config) {
  const res = await fetch(`${BASE}/simulate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.detail || `Server error ${res.status}`)
  return data
}

export async function checkHealth() {
  const res = await fetch(`${BASE}/health`)
  if (!res.ok) throw new Error('Backend offline')
  return res.json()
}
