'use client'
import { useEffect, useState } from 'react'

export default function WorkspacesPage() {
  const [spaces, setSpaces] = useState<any[]>([])
  const [name, setName] = useState('Meu Workspace')

  useEffect(() => {
    fetch('/api/spaces').then(r => r.json()).then(d => setSpaces(d.spaces ?? []))
  }, [])

  async function create() {
    const r = await fetch('/api/spaces', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    const d = await r.json()
    if (d?.workspace?.id) {
      window.location.href = `/space/${d.workspace.id}/flow-builder`
    }
  }

  return (
    <main className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Workspaces</h1>
      <div className="flex gap-2">
        <input className="border rounded px-2 py-1" value={name} onChange={e => setName(e.target.value)} />
        <button onClick={create} className="px-3 py-2 rounded bg-black text-white">Criar</button>
      </div>
      <ul className="list-disc pl-5">
        {spaces.map(s => (
          <li key={s.id} className="mt-2">
            <a className="underline" href={`/space/${s.id}/flow-builder`}>{s.name}</a>
          </li>
        ))}
      </ul>
    </main>
  )
}


