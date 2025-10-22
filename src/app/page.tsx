"use client"

import { useState } from 'react'

export default function Home() {
  const [flowId, setFlowId] = useState<string>('')
  const [output, setOutput] = useState<any>(null)

  async function createDemo() {
    const res = await fetch('/api/flows', {
      method: 'POST',
      body: JSON.stringify({ kind: 'demo' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const data = await res.json()
    setFlowId(data.flow.id)
  }

  async function run() {
    if (!flowId) return
    const res = await fetch(`/api/execute/${flowId}`, { method: 'POST' })
    const data = await res.json()
    setOutput(data)
  }

  return (
    <main className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">FlowFirst — Fase 1</h1>

      <div className="flex gap-2">
        <button
          className="px-4 py-2 rounded bg-black text-white"
          onClick={createDemo}
        >
          Criar fluxo demo
        </button>

        <button
          className="px-4 py-2 rounded bg-gray-900 text-white disabled:opacity-50"
          onClick={run}
          disabled={!flowId}
        >
          Executar
        </button>
      </div>

      {flowId && <p>Flow criado: <code>{flowId}</code></p>}

      {output && (
        <pre className="p-4 bg-gray-100 text-black rounded overflow-auto">
          {JSON.stringify(output, null, 2)}
        </pre>
      )}
    </main>
  )
}
