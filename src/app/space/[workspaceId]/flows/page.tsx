'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'

type Flow = { id: string; name: string; createdAt?: string }

export default function WorkspaceFlowsPage() {
  const { workspaceId } = useParams() as { workspaceId: string }
  const router = useRouter()
  const [flows, setFlows] = useState<Flow[]>([])
  const [name, setName] = useState('Novo Flow')

  async function load() {
    const r = await fetch(`/api/spaces/${workspaceId}/flows`)
    const d = await r.json()
    setFlows(d.flows ?? [])
  }

  useEffect(() => { void load() }, [])

  async function create(kind: 'blank' | 'demo') {
    const r = await fetch(`/api/spaces/${workspaceId}/flows`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(kind === 'demo' ? { kind } : { kind: 'blank' }),
    })
    const d = await r.json()
    await fetch(`/api/spaces/${workspaceId}/flows/${d.flow.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    router.push(`/space/${workspaceId}/flow-builder?flowId=${d.flow.id}`)
  }

  return (
    <main className="space-y-4">
      <h1 className="text-2xl font-bold">Flows do Workspace</h1>
      <div className="flex gap-2 items-center">
        <input className="border rounded px-2 py-1" value={name} onChange={e => setName(e.target.value)} />
        <button className="px-3 py-2 rounded bg-black text-white" onClick={() => create('blank')}>Criar Flow</button>
        <button className="px-3 py-2 rounded bg-gray-800 text-white" onClick={() => create('demo')}>Criar Demo</button>
      </div>
      <ul className="divide-y border rounded">
        {flows.map(f => (
          <li key={f.id} className="p-3 flex items-center justify-between">
            <div>
              <div className="font-medium">{f.name}</div>
              <div className="text-xs text-gray-500">{f.id}</div>
            </div>
            <button className="underline text-sm" onClick={() => router.push(`/space/${workspaceId}/flow-builder?flowId=${f.id}`)}>Abrir no Builder</button>
          </li>
        ))}
        {flows.length === 0 && <li className="p-3 text-sm text-gray-500">Nenhum flow ainda.</li>}
      </ul>
    </main>
  )
}


