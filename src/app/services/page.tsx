import { services } from '@/lib/services'

export default function ServicesCatalog() {
  const items = Object.values(services)
  return (
    <main className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Catálogo de Serviços</h1>
      <div className="grid md:grid-cols-2 gap-4">
        {items.map(s => (
          <div key={s.key} className="border rounded p-4">
            <h2 className="font-semibold">{s.label} <span className="text-gray-500 text-sm">({s.key})</span></h2>
            <p className="text-sm text-gray-700 mt-1">{s.meta?.description}</p>
            {s.meta?.inputs && (
              <div className="mt-2">
                <div className="text-xs font-semibold">Inputs:</div>
                <ul className="list-disc pl-5 text-xs">
                  {s.meta.inputs.map((i, idx) => <li key={idx}>{i}</li>)}
                </ul>
              </div>
            )}
            {s.meta?.outputs && (
              <div className="mt-2">
                <div className="text-xs font-semibold">Outputs:</div>
                <ul className="list-disc pl-5 text-xs">
                  {s.meta.outputs.map((o, idx) => <li key={idx}>{o}</li>)}
                </ul>
              </div>
            )}
            {s.meta?.example && (
              <pre className="mt-3 text-xs bg-gray-50 p-2 rounded overflow-auto">{JSON.stringify(s.meta.example, null, 2)}</pre>
            )}
          </div>
        ))}
      </div>
    </main>
  )
}


