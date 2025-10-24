'use client'
import { use as usePromise, useEffect, useState } from 'react'

export default function PublicFormPage({ params }: { params: Promise<{ token: string }> }) {
  const [meta, setMeta] = useState<any>(null)
  const [values, setValues] = useState<Record<string, string>>({})
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { token } = usePromise(params)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch(`/api/public/${token}`)
        const isJson = res.headers.get('content-type')?.includes('application/json')
        const d = isJson ? await res.json().catch(() => null) : null
        if (cancelled) return
        if (!res.ok) {
          setError((d as any)?.error ?? 'Erro ao carregar')
          return
        }
        setMeta(d)
      } catch {
        if (!cancelled) setError('Erro de rede')
      }
    }
    load()
    return () => { cancelled = true }
  }, [token])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      const res = await fetch(`/api/public/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: values }),
      })
      const isJson = res.headers.get('content-type')?.includes('application/json')
      const d = isJson ? await res.json().catch(() => null) : null
      if (!res.ok || !(d as any)?.ok) {
        setError((d as any)?.error ?? 'Erro ao enviar')
        return
      }
      setDone(true)
    } catch {
      setError('Erro de rede')
    }
  }

  if (error) return <main className="p-6">Erro: {error}</main>
  if (!meta) return <main className="p-6">Carregando…</main>
  if (done) return <main className="p-6">Obrigado! Seus dados foram enviados.</main>

  return (
    <main className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">{meta.title}</h1>
      {meta.description && <p className="text-gray-600">{meta.description}</p>}

      <form className="space-y-3 max-w-md" onSubmit={onSubmit}>
        {meta.fields.map((f: string) => (
          <div key={f} className="space-y-1">
            <label className="text-sm font-medium">{f}</label>
            <input
              className="w-full border rounded px-2 py-1"
              value={values[f] ?? ''}
              onChange={e => setValues(v => ({ ...v, [f]: e.target.value }))}
              required
            />
          </div>
        ))}
        <button className="px-4 py-2 rounded bg-black text-white">Enviar</button>
      </form>
    </main>
  )
}


