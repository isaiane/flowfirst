/*
 Manual F5 validator (APIs):
 - Creates workspace and flow
 - Saves definition with edges (approved/denied)
 - Runs twice (200→approved, 400→denied)
 - Lists executions and fetches details
 - Calls /api/copilot
 Usage:
   E2E_BASE_URL=http://localhost:3000 tsx scripts/test-f5-manual.ts
*/

const BASE = process.env.E2E_BASE_URL || 'http://localhost:3000'

async function j(r: Response) { const t = await r.text(); try { return JSON.parse(t) } catch { return { raw: t } } }
async function post(path: string, body?: any) { const r = await fetch(BASE + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined }); return { status: r.status, data: await j(r) } }
async function put(path: string, body?: any) { const r = await fetch(BASE + path, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined }); return { status: r.status, data: await j(r) } }
async function get(path: string) { const r = await fetch(BASE + path); return { status: r.status, data: await j(r) } }

type FlowNode = { id: string; type: string; label?: string; position?: { x: number; y: number }; config?: any; next?: string | null }
type FlowEdge = { from: string; to: string; via?: string | null }
type FlowDefinition = { start: string; nodes: FlowNode[]; edges?: FlowEdge[] }

(async () => {
  console.log('[F5] Base URL =', BASE)
  // 1) workspace
  const wsName = 'F5 Test WS ' + Math.random().toString(36).slice(2,6)
  const wsRes = await post('/api/spaces', { name: wsName })
  if (!wsRes.data?.workspace?.id) throw new Error('failed to create workspace: ' + JSON.stringify(wsRes))
  const wsId = wsRes.data.workspace.id as string
  console.log('[F5] workspace created', wsId)

  // 2) blank flow
  const flowRes = await post(`/api/spaces/${wsId}/flows`, { kind: 'blank' })
  const flowId = flowRes.data?.flow?.id as string
  if (!flowId) throw new Error('failed to create flow: ' + JSON.stringify(flowRes))
  console.log('[F5] flow created', flowId)

  // helper to save and run
  async function saveAndRun(url: string) {
    const def: FlowDefinition = {
      start: 'n1',
      nodes: [
        { id: 'n1', type: 'webhook', label: 'start', config: { url, method: 'GET' } },
        { id: 'n2', type: 'decision', label: 'dec', config: { rules: [ { when: { path: 'status', op: 'eq', value: 200 }, route: 'approved' } ], defaultRoute: 'denied' } },
        { id: 'A', type: 'webhook', label: 'A', config: { url: 'https://httpbin.org/status/204', method: 'GET' } },
        { id: 'B', type: 'webhook', label: 'B', config: { url: 'https://httpbin.org/status/204', method: 'GET' } },
      ],
      edges: [
        { from: 'n1', to: 'n2', via: 'default' },
        { from: 'n2', to: 'A', via: 'approved' },
        { from: 'n2', to: 'B', via: 'denied' },
      ],
    }
    const save = await put(`/api/spaces/${wsId}/flows/${flowId}`, { name: 'F5', definition: def })
    if (!save.data?.flow?.id) throw new Error('failed to save flow: ' + JSON.stringify(save))
    const run = await post(`/api/spaces/${wsId}/execute/${flowId}`)
    return run.data
  }

  // 3) run approved (200)
  const run200 = await saveAndRun('https://httpbin.org/status/200')
  console.log('[F5] run 200 ->', run200?.bag ? 'ok' : run200)
  if (!run200?.bag?.A && !run200?.bag?.B) throw new Error('bag missing A/B')
  if (!run200?.bag?.A) throw new Error('expected route approved → A')

  // 4) run denied (400)
  const run400 = await saveAndRun('https://httpbin.org/status/400')
  console.log('[F5] run 400 ->', run400?.bag ? 'ok' : run400)
  if (!run400?.bag?.B) throw new Error('expected route denied → B')

  // 5) executions list and detail
  const list = await get(`/api/spaces/${wsId}/executions?flowId=${flowId}`)
  if (!Array.isArray(list.data?.executions)) throw new Error('executions list failed: ' + JSON.stringify(list))
  const execId = list.data.executions[0]?.id
  const detail = await get(`/api/spaces/${wsId}/executions/${execId}`)
  if (!detail.data?.execution?.id || !Array.isArray(detail.data?.logs)) throw new Error(`execution detail failed: status=${detail.status} body=${JSON.stringify(detail.data)}`)
  console.log('[F5] executions ok:', list.data.executions.length, 'latest:', execId)

  // 6) copilot
  const cop = await post('/api/copilot', { prompt: 'capturar lead e enviar ao CRM' })
  if (!cop.data?.flow?.nodes) throw new Error('copilot failed: ' + JSON.stringify(cop))
  console.log('[F5] copilot ok, nodes:', cop.data.flow.nodes.length)

  console.log('\n[F5] PASS: named routes, executions APIs, and copilot validated.')
  console.log('Nota: validação Zod com feedback visual é no Builder (UI).')
})().catch(err => {
  console.error('[F5] FAIL:', err?.message || err)
  process.exit(1)
})


