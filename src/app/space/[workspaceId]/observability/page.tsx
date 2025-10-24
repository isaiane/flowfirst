'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'

export default function Observability() {
  const { workspaceId } = useParams() as { workspaceId: string }
  const [data, setData] = useState<any>(null)

  useEffect(() => {
    fetch(`/api/spaces/${workspaceId}/metrics`).then(r => r.json()).then(setData)
  }, [workspaceId])

  if (!data) return <main className="p-6">Carregando…</main>

  return (
    <main className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Observability</h1>

      <section className="space-y-2">
        <h2 className="font-semibold">Service Stats</h2>
        <table className="w-full text-sm border">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-2 text-left">Node</th>
              <th className="p-2">Service</th>
              <th className="p-2">Exec</th>
              <th className="p-2">OK</th>
              <th className="p-2">Falhas</th>
              <th className="p-2">p50 (ms)</th>
              <th className="p-2">p95 (ms)</th>
              <th className="p-2">Último (ms)</th>
            </tr>
          </thead>
          <tbody>
            {data.stats.map((s: any) => (
              <tr key={s.id} className="border-t">
                <td className="p-2 font-mono text-xs">{s.nodeId}</td>
                <td className="p-2">{s.serviceKey}</td>
                <td className="p-2">{s.executions}</td>
                <td className="p-2">{s.successes}</td>
                <td className="p-2">{s.failures}</td>
                <td className="p-2">{s.p50Ms}</td>
                <td className="p-2">{s.p95Ms}</td>
                <td className="p-2">{s.lastMs}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold">Circuit Health</h2>
        <table className="w-full text-sm border">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-2 text-left">Node</th>
              <th className="p-2">Service</th>
              <th className="p-2">State</th>
              <th className="p-2">Failures</th>
              <th className="p-2">Opened At</th>
            </tr>
          </thead>
          <tbody>
            {data.health.map((h: any) => (
              <tr key={h.id} className="border-t">
                <td className="p-2 font-mono text-xs">{h.nodeId}</td>
                <td className="p-2">{h.serviceKey}</td>
                <td className="p-2">{h.state}</td>
                <td className="p-2">{h.failures}</td>
                <td className="p-2">{h.openedAt ? new Date(h.openedAt).toLocaleString() : '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  )
}


