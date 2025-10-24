import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const { prompt } = await req.json().catch(() => ({ prompt: '' }))
  const apiKey = process.env.OPENAI_API_KEY

  const fallback = {
    flow: {
      start: 'n1',
      nodes: [
        { id: 'n1', type: 'form', label: 'Capturar contato', config: { title: 'Contato', fields: ['nome','email'] }, next: 'n2' },
        { id: 'n2', type: 'webhook', label: 'Enviar ao CRM', config: { url: 'https://httpbin.org/post', method: 'POST' }, next: 'n3' },
        { id: 'n3', type: 'decision', label: 'Status OK?', config: { rules: [{ when: { path: 'status', op: 'eq', value: 200 }, next: null }], defaultNext: null } }
      ]
    },
    note: apiKey ? undefined : 'fallback used: set OPENAI_API_KEY to generate suggestions from the prompt'
  }

  if (!apiKey) return NextResponse.json(fallback)

  try {
    const sys = `Você é um assistente que gera um JSON de fluxo para um builder visual.\nResponda APENAS JSON no formato:\n{ "flow": { "start": "id", "nodes": [ { "id": "...", "type": "form|webhook|decision", "label": "...", "config": {...}, "next": "id|null" } ] } }`
    const user = `Prompt: ${prompt}`

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'gpt-4o-mini', messages: [{ role: 'system', content: sys }, { role: 'user', content: user }], temperature: 0.2 }),
    })
    const json = await res.json()
    const text = json?.choices?.[0]?.message?.content ?? ''
    let out: any = fallback
    try { out = JSON.parse(text) } catch {}
    return NextResponse.json(out)
  } catch {
    return NextResponse.json(fallback)
  }
}


