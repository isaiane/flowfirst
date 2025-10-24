'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'

export default function ExecutionDetail() {
  const { workspaceId, id } = useParams() as { workspaceId: string; id: string }
  const [data, setData] = useState<any>(null)

  useEffect(() => {
    fetch(`/api/spaces/${workspaceId}/executions/${id}`).then(r => r.json()).then(setData)
  }, [workspaceId, id])

  if (!data) return <main className="p-6">Carregando…</main>
  if (data?.error) return <main className="p-6">Erro: {data.error}</main>

  const e = data.execution
  return (
    <main className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Execução {e.id}</h1>
      <div className="text-sm">Flow: {e.flow?.name} <span className="text-gray-500">({e.flowId})</span></div>
      <div className="grid md:grid-cols-3 gap-4">
        <div className="border rounded p-3">
          <div><b>Status:</b> {e.status}</div>
          <div><b>Início:</b> {e.startedAt ? new Date(e.startedAt).toLocaleString() : '-'}</div>
          <div><b>Fim:</b> {e.finishedAt ? new Date(e.finishedAt).toLocaleString() : '-'}</div>
        </div>
        <div className="border rounded p-3 md:col-span-2">
          <div className="font-semibold mb-2">Resultado</div>
          <pre className="text-xs bg-gray-50 p-2 rounded overflow-auto">{JSON.stringify(e.result, null, 2)}</pre>
        </div>
      </div>

      <div className="border rounded p-3">
        <div className="font-semibold mb-2">Logs</div>
        <ul className="space-y-1 text-sm">
          {data.logs.map((l: any) => (
            <li key={l.id} className="font-mono text-xs">
              {new Date(l.timestamp).toLocaleTimeString()} [{l.level}] {l.message}
              {l.data && <pre className="inline-block ml-2">{JSON.stringify(l.data)}</pre>}
            </li>
          ))}
        </ul>
      </div>
    </main>
  )
}


