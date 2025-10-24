import { FlowService } from './types'

export const FormService: FlowService = {
	 key: 'form',
	 label: 'Form',
  meta: {
    description: 'Coleta dados via página pública e retoma a execução.',
    inputs: ['Qualquer JSON'],
    outputs: ['{ form: "waiting" } ou dados do usuário na retomada'],
    example: { title: 'Contato', fields: ['nome', 'email'] },
    namedRoutes: ['default'],
    defaults: { timeoutMs: 0, retry: { maxAttempts: 1 } },
  },

  async onRun({ node }) {
    const cfg = (node.config ?? {}) as any
    const payload = {
      title: cfg.title ?? 'Formulário',
      description: cfg.description ?? 'Preencha os dados abaixo.',
      fields: Array.isArray(cfg.fields) ? cfg.fields : [],
    }

    return { wait: { kind: 'form', payload, resumeNext: node.next ?? null } }
	 },
}
