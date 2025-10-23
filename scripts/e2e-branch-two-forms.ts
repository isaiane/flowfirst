;(async () => {
	 const base = process.env.E2E_BASE_URL || 'http://localhost:3000'

	 // 0) Criar workspace (bypass)
	 const ws = await fetchJson(base + '/api/spaces', {
		 method: 'POST',
		 headers: { 'Content-Type': 'application/json' },
		 body: JSON.stringify({ name: 'E2E Branch' }),
	 })
	 const workspaceId = ws.workspace.id as string

	 // 1) Criar fluxo em branco (namespaced)
	 const created = await fetchJson(base + `/api/spaces/${workspaceId}/flows`, {
		 method: 'POST',
		 headers: { 'Content-Type': 'application/json' },
		 body: JSON.stringify({ kind: 'blank' }),
	 })
	 const flowId = created.flow.id as string

	 // 2) Definir fluxo com Decision -> f1 (200) | f2 (default)
	 const def = {
		 start: 'w1',
		 nodes: [
			 { id: 'w1', type: 'webhook', label: 'Webhook', config: { url: 'https://example.com', method: 'GET' }, next: 'd1' },
			 { id: 'd1', type: 'decision', label: 'Decision', config: { source: 'lastOutput', rules: [ { when: { path: 'status', op: 'eq', value: 200 }, next: 'f1' } ], defaultNext: 'f2' }, next: null },
			 { id: 'f1', type: 'form', label: 'Form 200', config: { fields: ['ok'] }, next: null },
			 { id: 'f2', type: 'form', label: 'Form not-200', config: { fields: ['err'] }, next: null },
		 ],
	 }
	 await fetchJson(base + `/api/spaces/${workspaceId}/flows/${flowId}`, {
		 method: 'PUT',
		 headers: { 'Content-Type': 'application/json' },
		 body: JSON.stringify({ name: 'Branch 2 Forms', definition: def }),
	 })

	 // 3) Run A (200 -> f1)
	 const runA = await fetchJson(base + `/api/spaces/${workspaceId}/execute/${flowId}`, { method: 'POST' })

	 // 4) Ajustar webhook para 404 e rodar novamente (-> f2)
	 def.nodes = def.nodes.map((n: any) => n.id === 'w1' ? { ...n, config: { url: 'https://httpbin.org/status/404', method: 'GET' } } : n)
	 await fetchJson(base + `/api/spaces/${workspaceId}/flows/${flowId}`, {
		 method: 'PUT',
		 headers: { 'Content-Type': 'application/json' },
		 body: JSON.stringify({ name: 'Branch 2 Forms', definition: def }),
	 })
	 const runB = await fetchJson(base + `/api/spaces/${workspaceId}/execute/${flowId}`, { method: 'POST' })

	 const summary = {
		 flowId,
		 A: { ok: runA.ok, wentTo: runA.bag?.f1 ? 'f1' : (runA.bag?.f2 ? 'f2' : 'unknown') },
		 B: { ok: runB.ok, wentTo: runB.bag?.f1 ? 'f1' : (runB.bag?.f2 ? 'f2' : 'unknown') },
	 }
	 console.log(JSON.stringify(summary, null, 2))
 

async function fetchJson(url: string, init?: RequestInit) {
	 const res = await fetch(url, init)
	 if (!res.ok) {
		 const text = await res.text()
		 throw new Error(`HTTP ${res.status}: ${text}`)
	 }
	 return res.json()
}

})().catch(err => {
	 console.error(err)
	 process.exit(1)
})
