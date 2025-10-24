'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'

export default function ExecutionsPage() {
  const { workspaceId } = useParams() as { workspaceId: string }
  const [items, setItems] = useState<any[]>([])

  useEffect(() => {
    fetch(`/api/spaces/${workspaceId}/executions`).then(r => r.json()).then(d => setItems(d.executions ?? []))
  }, [workspaceId])

  return (
    <main className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Execuções</h1>
      <table className="w-full text-sm border">
        <thead className="bg-gray-50">
          <tr><th className="p-2 text-left">ID</th><th className="p-2">Status</th><th className="p-2">Início</th><th className="p-2">Fim</th><th className="p-2"></th></tr>
        </thead>
        <tbody>
        {items.map((e) => (
          <tr key={e.id} className="border-t">
            <td className="p-2 font-mono text-xs">{e.id}</td>
            <td className="p-2">{e.status}</td>
            <td className="p-2">{e.startedAt ? new Date(e.startedAt).toLocaleString() : '-'}</td>
            <td className="p-2">{e.finishedAt ? new Date(e.finishedAt).toLocaleString() : '-'}</td>
            <td className="p-2 text-right">
              <a className="underline" href={`./executions/${e.id}`}>Ver</a>
            </td>
          </tr>
        ))}
        </tbody>
      </table>
    </main>
  )
}


