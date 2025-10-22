import { FlowNode, FlowService } from './types'

export const WebhookService: FlowService = {
  key: 'webhook',
  label: 'Webhook',
  meta: {
    description: 'Chama uma URL externa (GET/POST/PUT/PATCH) e retorna status e payload.',
    inputs: ['Qualquer JSON (opcional)'],
    outputs: ['{ status: number, data: any }'],
    example: { url: 'https://httpbin.org/post', method: 'POST', body: { foo: 'bar' } },
  },

  async onCreate({ node }) {
    if (!node.config) node.config = {}
  },

  async onSave() {},

  async onDelete() {},

  async onRun({ node, input }) {
    const cfg = (node.config ?? {}) as any
    const method = (cfg.method ?? 'POST').toUpperCase()
    const url = cfg.url
    if (!url) throw new Error(`Node ${node.id} (webhook) sem 'url'`)

    const headers = cfg.headers ?? {}
    const body = method === 'GET' ? undefined : JSON.stringify(cfg.body ?? input ?? {})

    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body,
    })

    const text = await res.text()
    let json: unknown
    try {
      json = JSON.parse(text)
    } catch {
      json = { text }
    }

    return { output: { status: res.status, data: json } }
  },
}


