import http from 'node:http'

async function main() {
	 const base = process.env.E2E_BASE_URL || 'http://localhost:3000'
	 const flow = await fetchJson(base + '/api/flows', {
		 method: 'POST',
		 headers: { 'Content-Type': 'application/json' },
		 body: JSON.stringify({ kind: 'demo' }),
	 })
	 const flowId = flow.flow.id as string
	 const exec = await fetchJson(base + `/api/execute/${flowId}`, { method: 'POST' })
	 const ok = exec.ok === true && exec.result?.status === 200
	 console.log(JSON.stringify({ ok, flowId, executionId: exec.executionId }, null, 2))
}

async function fetchJson(url: string, init?: RequestInit) {
	 const res = await fetch(url, init)
	 if (!res.ok) {
		 const text = await res.text()
		 throw new Error(`HTTP ${res.status}: ${text}`)
	 }
	 return res.json()
}

main().catch(err => {
	 console.error(err)
	 process.exit(1)
})
