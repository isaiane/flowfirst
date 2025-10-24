'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  addEdge,
  Connection,
  Edge,
  Node,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { serviceSchemas } from '@/lib/services/schemas'

type FlowNode = {
  id: string
  type: string
  label?: string
  position?: { x: number; y: number }
  config?: Record<string, any>
  next?: string | null
}

type FlowEdge = { from: string; to: string; via?: string | null }

type FlowDefinition = {
  start: string
  nodes: FlowNode[]
  edges?: FlowEdge[]
}

const servicePalette = [
  { key: 'webhook', label: 'Webhook' },
  { key: 'decision', label: 'Decision' },
  { key: 'form', label: 'Form' },
]

function randomPos() {
  return { x: Math.round(Math.random() * 300), y: Math.round(Math.random() * 300) }
}

function toReactFlow(def: FlowDefinition) {
  const nodes: Node[] = def.nodes.map(n => ({
    id: n.id,
    position: n.position ?? randomPos(),
    data: { label: `${n.label ?? n.type} (${n.id})`, _raw: n },
    type: 'default',
  }))
  const edges: Edge[] = []
  for (const e of (def.edges ?? [])) {
    edges.push({ id: `${e.from}->${e.to}${e.via ? `:${e.via}` : ''}`, source: e.from, target: e.to, label: e.via ?? undefined })
  }
  for (const n of def.nodes) {
    if (n.next && !(def.edges ?? []).some(e => e.from === n.id)) {
      edges.push({ id: `${n.id}->${n.next}`, source: n.id, target: String(n.next), label: 'default' })
    }
  }
  return { nodes, edges }
}

function fromReactFlow(nodes: Node[], edges: Edge[], prev?: FlowDefinition): FlowDefinition {
  const namedEdges: FlowEdge[] = edges.map(e => ({ from: e.source, to: e.target, via: (e.label as string | undefined) ?? 'default' }))
  const outNodes: FlowNode[] = nodes.map(n => {
    const raw: FlowNode = (n.data?._raw ?? {}) as any
    return {
      id: n.id,
      type: raw.type ?? 'webhook',
      label: raw.label ?? raw.type ?? 'node',
      position: n.position,
      config: raw.config ?? {},
      next: raw.next ?? null,
    }
  })
  const start = prev?.start && outNodes.find(n => n.id === prev.start) ? prev.start : (outNodes[0]?.id ?? 'node-1')
  return { start, nodes: outNodes, edges: namedEdges }
}

export default function FlowBuilderPage() {
  const { workspaceId } = useParams() as { workspaceId: string }
  const search = useSearchParams()
  const initialFlowId = search.get('flowId') || ''

  const [flowId, setFlowId] = useState<string>(initialFlowId)
  const [name, setName] = useState<string>('Meu Fluxo')
  const [definition, setDefinition] = useState<FlowDefinition>({ start: 'node-1', nodes: [], edges: [] })
  const [errors, setErrors] = useState<Record<string, string[]>>({})
  const [copilotOpen, setCopilotOpen] = useState(false)
  const [prompt, setPrompt] = useState('Quero um fluxo de lead: capturar nome/email, enviar ao CRM e checar retorno.')

  const initialRF = useMemo(() => toReactFlow(definition), [])
  const [nodes, setNodes, onNodesChange] = useNodesState(initialRF.nodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialRF.edges)

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null)

  useEffect(() => {
    async function loadFlow() {
      if (!initialFlowId) return
      const r = await fetch(`/api/spaces/${workspaceId}/flows/${initialFlowId}`)
      const d = await r.json()
      setFlowId(d.flow.id)
      const def = d.flow.definition as FlowDefinition
      setDefinition(def)
      const rf = toReactFlow(def)
      setNodes(rf.nodes)
      setEdges(rf.edges)
    }
    void loadFlow()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialFlowId, workspaceId])

  function onConnect(c: Connection) {
    setEdges(eds => addEdge({ ...c, id: `${c.source}-${c.target}` } as Edge, eds))
  }

  function addNode(type: string) {
    const id = `node-${Math.random().toString(36).slice(2, 7)}`
    const node: Node = {
      id,
      position: randomPos(),
      data: { label: `${type} (${id})`, _raw: { id, type, label: type, position: randomPos(), config: {} } },
      type: 'default',
    }
    setNodes(ns => [...ns, node])
  }

  function selectNode(id: string) {
    setSelectedNodeId(id)
    setSelectedEdgeId(null)
  }

  function selectEdge(id: string) {
    setSelectedEdgeId(id)
    setSelectedNodeId(null)
  }

  function updateSelectedConfig(patch: Record<string, any>) {
    setNodes(ns =>
      ns.map(n => {
        if (n.id !== selectedNodeId) return n
        const raw = (n.data?._raw ?? {}) as any
        const updated = { ...raw, config: { ...(raw.config ?? {}), ...patch } }
        return { ...n, data: { ...n.data, _raw: updated, label: `${updated.label ?? updated.type} (${n.id})` } }
      }),
    )
  }

  function updateEdgeLabel(newLabel: string) {
    if (!selectedEdgeId) return
    setEdges(es => es.map(e => e.id === selectedEdgeId ? { ...e, label: newLabel || undefined } : e))
  }

  function validate(def: FlowDefinition) {
    const errs: Record<string, string[]> = {}
    for (const n of def.nodes) {
      const schema = serviceSchemas[n.type]
      if (!schema) continue
      const res = schema.safeParse(n.config ?? {})
      if (!res.success) {
        errs[n.id] = res.error.issues.map((i: any) => `${i.path.join('.') || n.type}: ${i.message}`)
      }
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function save() {
    const def = fromReactFlow(nodes, edges, definition)
    setDefinition(def)
    const ok = validate(def)
    if (!ok) { alert('Há erros de configuração nos nós. Confira o painel de erros.'); return }
    await fetch(`/api/spaces/${workspaceId}/flows/${flowId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, definition: def }),
    })
    alert('Fluxo salvo!')
  }

  async function run() {
    if (!flowId) return
    const res = await fetch(`/api/spaces/${workspaceId}/execute/${flowId}`, { method: 'POST' })
    const data = await res.json()
    if (data?.waiting?.publicUrl) {
      alert(`Execução pausada. Abra: ${data.waiting.publicUrl}`)
    } else {
      alert(data?.ok === false ? `Erro: ${data?.error}` : 'Execução finalizada (ver logs)')
    }
  }

  async function importFromCopilot() {
    const r = await fetch('/api/copilot', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
    })
    const d = await r.json()
    const flow = (d?.flow ?? { start: 'n1', nodes: [] }) as FlowDefinition
    const edgesConv: FlowEdge[] = []
    for (const n of (flow.nodes ?? [])) {
      if ((n as any).config?.rules?.length) {
        for (const r of (n as any).config.rules) {
          if (r?.route && r?.next) edgesConv.push({ from: n.id, to: r.next, via: r.route })
        }
      }
      if ((n as any).next) edgesConv.push({ from: n.id, to: (n as any).next, via: 'default' })
    }
    const normalized: FlowDefinition = { start: (flow as any).start, nodes: flow.nodes, edges: edgesConv }
    setDefinition(normalized)
    const rf = toReactFlow(normalized)
    setNodes(rf.nodes); setEdges(rf.edges)
    setCopilotOpen(false)
  }

  const selected = nodes.find(n => n.id === selectedNodeId)
  const selectedEdge = edges.find(e => e.id === selectedEdgeId)
  const nodeErrors = selected ? (errors[selected.id] ?? []) : []
  const sourceNode = selectedEdge ? nodes.find(n => n.id === selectedEdge.source) : null
  const sourceService = sourceNode ? (sourceNode.data as any)?._raw?.type : null
  const [routes, setRoutes] = useState<string[]>([])

  useEffect(() => {
    (async () => {
      if (!sourceService) { setRoutes([]); return }
      try {
        const r = await fetch('/api/services')
        const d = await r.json()
        const item = (d?.services ?? []).find((s: any) => s.key === sourceService)
        setRoutes(item?.meta?.namedRoutes ?? [])
      } catch { setRoutes([]) }
    })()
  }, [sourceService])

  return (
    <ReactFlowProvider>
      <div className="grid grid-cols-12 h-[calc(100vh-2rem)] gap-3 p-3">
        <aside className="col-span-2 border rounded p-3 space-y-3">
          <div className="space-y-2">
            <label className="text-sm font-medium">Nome do Fluxo</label>
            <input value={name} onChange={e => setName(e.target.value)} className="w-full border rounded px-2 py-1" />
          </div>

          <div className="space-y-2">
            <div className="text-sm font-medium">Nodes</div>
            {servicePalette.map(s => (
              <button key={s.key} onClick={() => addNode(s.key)} className="w-full border rounded px-2 py-1 text-left hover:bg-gray-50">
                + {s.label}
              </button>
            ))}
          </div>

          <div className="space-y-2 pt-4">
            <button onClick={save} className="w-full bg-black text-white rounded px-3 py-2">Salvar</button>
            <button onClick={run} className="w-full bg-gray-900 text-white rounded px-3 py-2">Executar</button>
            <a href={`/space/${workspaceId}/executions`} className="w-full block text-center border rounded px-3 py-2">Execuções</a>
            <button onClick={() => setCopilotOpen(true)} className="w-full border rounded px-3 py-2">Importar do Copilot</button>
          </div>

          <div className="pt-4">
            <div className="text-sm font-semibold">Erros</div>
            {Object.keys(errors).length === 0 && <div className="text-xs text-gray-500">Nenhum erro</div>}
            {Object.entries(errors).map(([id, list]) => (
              <div key={id} className="mt-2">
                <div className="text-xs font-semibold">Nó {id}</div>
                <ul className="list-disc pl-5 text-xs text-red-600">
                  {list.map((e, i) => <li key={i}>{e}</li>)}
                </ul>
              </div>
            ))}
          </div>
        </aside>

        <main className="col-span-7 border rounded">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            fitView
            onNodeClick={(_, n) => selectNode(n.id)}
            onEdgeClick={(_, e) => selectEdge(e.id)}
          >
            <Background />
            <MiniMap />
            <Controls />
          </ReactFlow>
        </main>

        <section className="col-span-3 border rounded p-3 space-y-3">
          <div className="text-sm font-semibold">Inspector</div>
          {!selected && !selectedEdge && <div className="text-sm text-gray-500">Selecione um nó ou uma aresta</div>}
          {selected && (
            <>
              <div className="space-y-2">
                <div className="text-sm">ID: <code>{selected.id}</code></div>
                <div className="text-sm">Tipo: {(selected.data?._raw?.type) || 'default'}</div>
              </div>

              {selected.data?._raw?.type === 'webhook' && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">URL</label>
                  <input className="w-full border rounded px-2 py-1" defaultValue={selected.data?._raw?.config?.url ?? ''} onBlur={e => updateSelectedConfig({ url: e.target.value })} />
                  {!selected.data?._raw?.config?.url && (
                    <p className="text-xs text-amber-600">Informe uma URL (ex.: https://httpbin.org/post).</p>
                  )}
                  <label className="text-sm font-medium">Method</label>
                  <select className="w-full border rounded px-2 py-1" defaultValue={selected.data?._raw?.config?.method ?? 'POST'} onChange={e => updateSelectedConfig({ method: e.target.value })}>
                    <option>GET</option><option>POST</option><option>PUT</option><option>PATCH</option>
                  </select>
                </div>
              )}

              {selected.data?._raw?.type === 'decision' && (
                <div className="space-y-2">
                  <p className="text-xs text-gray-600">Regras: defina <code>route</code> para casar com o rótulo da aresta.</p>
                  <button className="border rounded px-2 py-1" onClick={() => {
                    const rules = selected.data?._raw?.config?.rules ?? []
                    updateSelectedConfig({ rules: [...rules, { when: { path: 'status', op: 'eq', value: 200 }, route: 'approved' }] })
                  }}>+ Adicionar Regra</button>
                  {(selected.data?._raw?.config?.rules ?? []).map((r: any, idx: number) => (
                    <div key={idx} className="grid grid-cols-4 gap-2 items-center text-xs">
                      <input className="col-span-2 border rounded px-2 py-1" placeholder="path" defaultValue={r.when?.path ?? ''} onBlur={e => {
                        const rules = [...(selected.data?._raw?.config?.rules ?? [])]
                        rules[idx] = { ...r, when: { ...(r.when ?? {}), path: e.target.value } }
                        updateSelectedConfig({ rules })
                      }} />
                      <select className="border rounded px-2 py-1" defaultValue={r.when?.op ?? 'eq'} onChange={e => {
                        const rules = [...(selected.data?._raw?.config?.rules ?? [])]
                        rules[idx] = { ...r, when: { ...(r.when ?? {}), op: e.target.value } }
                        updateSelectedConfig({ rules })
                      }}>
                        <option>eq</option><option>neq</option><option>gt</option><option>lt</option><option>gte</option><option>lte</option>
                      </select>
                      <input className="border rounded px-2 py-1" placeholder="value" defaultValue={r.when?.value ?? ''} onBlur={e => {
                        const rules = [...(selected.data?._raw?.config?.rules ?? [])]
                        rules[idx] = { ...r, when: { ...(r.when ?? {}), value: e.target.value } }
                        updateSelectedConfig({ rules })
                      }} />
                      <input className="col-span-2 border rounded px-2 py-1" placeholder="route (ex.: approved)" defaultValue={r.route ?? ''} onBlur={e => {
                        const rules = [...(selected.data?._raw?.config?.rules ?? [])]
                        rules[idx] = { ...r, route: e.target.value }
                        updateSelectedConfig({ rules })
                      }} />
                      <input className="col-span-2 border rounded px-2 py-1" placeholder="next node id (legado)" defaultValue={r.next ?? ''} onBlur={e => {
                        const rules = [...(selected.data?._raw?.config?.rules ?? [])]
                        rules[idx] = { ...r, next: e.target.value }
                        updateSelectedConfig({ rules })
                      }} />
                    </div>
                  ))}
                  <label className="text-sm font-medium">Default route</label>
                  <input className="w-full border rounded px-2 py-1" placeholder="default" defaultValue={selected.data?._raw?.config?.defaultRoute ?? 'default'} onBlur={e => updateSelectedConfig({ defaultRoute: e.target.value })} />
                </div>
              )}

              {selected.data?._raw?.type === 'form' && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Campos (vírgula)</label>
                  <input className="w-full border rounded px-2 py-1" placeholder="nome,email,telefone" defaultValue={(selected.data?._raw?.config?.fields ?? []).join(',')} onBlur={e => {
                    const fields = e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                    updateSelectedConfig({ fields })
                  }} />
                </div>
              )}
              {nodeErrors.length > 0 && (
                <div className="rounded border border-red-300 bg-red-50 p-2">
                  <div className="text-xs font-semibold text-red-700">Erros neste nó</div>
                  <ul className="list-disc pl-5 text-xs text-red-700">
                    {nodeErrors.map((e, i) => <li key={i}>{e}</li>)}
                  </ul>
                </div>
              )}
            </>
          )}

          {selectedEdge && (
            <div className="space-y-2">
              <div className="text-sm">Aresta: <code>{selectedEdge.source} → {selectedEdge.target}</code></div>
              <label className="text-sm font-medium">Rota (via)</label>
              {routes.length > 0 ? (
                <select className="w-full border rounded px-2 py-1" defaultValue={(selectedEdge.label as string) || ''} onChange={e => updateEdgeLabel(e.target.value)}>
                  <option value="">(vazio)</option>
                  {routes.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              ) : (
                <input className="w-full border rounded px-2 py-1" defaultValue={selectedEdge.label as string || ''} onBlur={e => updateEdgeLabel(e.target.value.trim() || 'default')} />
              )}
              <p className="text-xs text-gray-600">Ex.: <code>approved</code>, <code>denied</code>, <code>default</code></p>
            </div>
          )}
        </section>
      </div>

      {copilotOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
          <div className="bg-white rounded p-4 w-full max-w-xl space-y-3">
            <h2 className="text-lg font-semibold">Importar do Copilot</h2>
            <textarea className="w-full border rounded p-2 h-32" value={prompt} onChange={e => setPrompt(e.target.value)} />
            <div className="flex justify-end gap-2">
              <button className="border rounded px-3 py-2" onClick={() => setCopilotOpen(false)}>Cancelar</button>
              <button className="bg-black text-white rounded px-3 py-2" onClick={importFromCopilot}>Importar</button>
            </div>
          </div>
        </div>
      )}
    </ReactFlowProvider>
  )
}


