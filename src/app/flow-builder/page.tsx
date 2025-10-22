'use client'

import { useEffect, useMemo, useState } from 'react'
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

type FlowNode = {
  id: string
  type: string
  label?: string
  position?: { x: number; y: number }
  config?: Record<string, any>
  next?: string | null
}

type FlowDefinition = {
  start: string
  nodes: FlowNode[]
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
  const edges: Edge[] = def.nodes
    .filter(n => !!n.next)
    .map(n => ({ id: `${n.id}->${n.next}`, source: n.id, target: String(n.next) }))
  return { nodes, edges }
}

function fromReactFlow(nodes: Node[], edges: Edge[], prev?: FlowDefinition): FlowDefinition {
  const nextMap: Record<string, string | null> = {}
  edges.forEach(e => { nextMap[e.source] = e.target })

  const outNodes: FlowNode[] = nodes.map(n => {
    const raw: FlowNode = (n.data?._raw ?? {}) as any
    return {
      id: n.id,
      type: raw.type ?? 'webhook',
      label: raw.label ?? raw.type ?? 'node',
      position: n.position,
      config: raw.config ?? {},
      next: nextMap[n.id] ?? raw.next ?? null,
    }
  })

  const start = prev?.start && outNodes.find(n => n.id === prev.start) ? prev.start : (outNodes[0]?.id ?? 'node-1')
  return { start, nodes: outNodes }
}

export default function FlowBuilderPage() {
  const [flowId, setFlowId] = useState<string>('')
  const [name, setName] = useState<string>('Meu Fluxo')
  const [definition, setDefinition] = useState<FlowDefinition>({ start: 'node-1', nodes: [] })

  const initialRF = useMemo(() => toReactFlow(definition), [])
  const [nodes, setNodes, onNodesChange] = useNodesState(initialRF.nodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialRF.edges)

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)

  useEffect(() => {
    async function ensureFlow() {
      const res = await fetch('/api/flows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: 'blank' }),
      })
      const data = await res.json()
      setFlowId(data.flow.id)

      const def: FlowDefinition = {
        start: 'node-1',
        nodes: [
          {
            id: 'node-1',
            type: 'webhook',
            label: 'Webhook inicial',
            position: { x: 100, y: 100 },
            config: { url: 'https://httpbin.org/post', method: 'POST', body: { hello: 'flowfirst' } },
            next: null,
          },
        ],
      }
      setDefinition(def)
      const rf = toReactFlow(def)
      setNodes(rf.nodes)
      setEdges(rf.edges)
    }
    void ensureFlow()
  }, [setEdges, setNodes])

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

  async function save() {
    const def = fromReactFlow(nodes, edges, definition)
    setDefinition(def)
    await fetch(`/api/flows/${flowId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, definition: def }),
    })
    alert('Fluxo salvo!')
  }

  async function run() {
    if (!flowId) return
    const res = await fetch(`/api/execute/${flowId}`, { method: 'POST' })
    const data = await res.json()
    console.log('RUN RESULT', data)
    alert(data?.ok ? 'Execução iniciada com sucesso (veja logs no banco)' : `Erro: ${data?.error}`)
  }

  const selected = nodes.find(n => n.id === selectedNodeId)

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
          >
            <Background />
            <MiniMap />
            <Controls />
          </ReactFlow>
        </main>

        <section className="col-span-3 border rounded p-3 space-y-3">
          <div className="text-sm font-semibold">Inspector</div>
          {!selected && <div className="text-sm text-gray-500">Selecione um node no canvas</div>}
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
                  <label className="text-sm font-medium">Method</label>
                  <select className="w-full border rounded px-2 py-1" defaultValue={selected.data?._raw?.config?.method ?? 'POST'} onChange={e => updateSelectedConfig({ method: e.target.value })}>
                    <option>GET</option><option>POST</option><option>PUT</option><option>PATCH</option>
                  </select>
                </div>
              )}

              {selected.data?._raw?.type === 'decision' && (
                <div className="space-y-2">
                  <p className="text-xs text-gray-600">Regras: path, op, value → next</p>
                  <button className="border rounded px-2 py-1" onClick={() => {
                    const rules = selected.data?._raw?.config?.rules ?? []
                    updateSelectedConfig({ rules: [...rules, { when: { path: 'status', op: 'eq', value: 200 }, next: '' }] })
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
                      <input className="col-span-4 border rounded px-2 py-1" placeholder="next node id" defaultValue={r.next ?? ''} onBlur={e => {
                        const rules = [...(selected.data?._raw?.config?.rules ?? [])]
                        rules[idx] = { ...r, next: e.target.value }
                        updateSelectedConfig({ rules })
                      }} />
                    </div>
                  ))}
                  <label className="text-sm font-medium">Default next</label>
                  <input className="w-full border rounded px-2 py-1" placeholder="node-id" defaultValue={selected.data?._raw?.config?.defaultNext ?? ''} onBlur={e => updateSelectedConfig({ defaultNext: e.target.value })} />
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
            </>
          )}
        </section>
      </div>
    </ReactFlowProvider>
  )
}


