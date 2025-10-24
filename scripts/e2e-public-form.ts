;(async () => {
  const base = process.env.E2E_BASE_URL || 'http://localhost:3000'

  async function fetchJson(url: string, init?: RequestInit) {
    const r = await fetch(url, init)
    if (!r.ok) throw new Error(`HTTP ${r.status}: ${await r.text()}`)
    return r.json()
  }

  const ws = await fetchJson(base + '/api/spaces', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'WS E2E Public' }),
  })
  const wid = ws.workspace.id as string

  const created = await fetchJson(base + `/api/spaces/${wid}/flows`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind: 'blank' }),
  })
  const fid = created.flow.id as string

  const def = {
    start: 'n1',
    nodes: [
      { id: 'n1', type: 'form', label: 'Lead', config: { title: 'Lead', fields: ['nome','email'] }, next: 'n2' },
      { id: 'n2', type: 'webhook', label: 'HTTPBin', config: { url: 'https://httpbin.org/post', method: 'POST' }, next: null },
    ],
  }
  await fetchJson(base + `/api/spaces/${wid}/flows/${fid}`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'Flow Public', definition: def }),
  })

  const exec = await fetch(base + `/api/spaces/${wid}/execute/${fid}`, { method: 'POST' }).then(r => r.json())
  if (!exec.waiting?.token) throw new Error('Sem token de espera')
  const token = exec.waiting.token as string

  const meta = await fetchJson(base + `/api/public/${token}`)
  if (!Array.isArray(meta.fields) || meta.fields.length === 0) throw new Error('Meta inválida')

  const submit = await fetchJson(base + `/api/public/${token}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data: { nome: 'Ana', email: 'ana@example.com' } }),
  })
  console.log(JSON.stringify({ ok: submit.ok === true, executionId: submit?.result?.executionId || exec.executionId }, null, 2))
})().catch(err => { console.error(err); process.exit(1) })


