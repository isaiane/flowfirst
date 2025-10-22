;(async () => {
  const base = process.env.E2E_BASE_URL || 'http://localhost:3000'
  // 1) Criar workspace (usa bypass do guard)
  const ws = await fetchJson(base + '/api/spaces', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'WS E2E' })
  })
  const workspaceId = ws.workspace?.id
  if (!workspaceId) throw new Error('workspaceId missing')

  // 2) Criar flow demo no workspace
  const flow = await fetchJson(base + `/api/spaces/${workspaceId}/flows`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind: 'demo' })
  })
  const flowId = flow.flow.id

  // 3) Executar
  const exec = await fetchJson(base + `/api/spaces/${workspaceId}/execute/${flowId}`, { method: 'POST' })

  console.log(JSON.stringify({ workspaceId, flowId, ok: exec.ok === true }, null, 2))
})().catch(err => { console.error(err); process.exit(1) })

async function fetchJson(url: string, init?: RequestInit) {
  const res = await fetch(url, init)
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`HTTP ${res.status}: ${text}`)
  }
  return res.json()
}



