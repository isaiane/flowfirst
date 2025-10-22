import { FlowService } from './types'

export const FormService: FlowService = {
	 key: 'form',
	 label: 'Form',
  meta: {
    description: '(Stub) Propaga configuração de formulário; captura real na Fase 4.',
    inputs: ['Qualquer JSON'],
    outputs: ['{ formConfig, input }'],
    example: { fields: ['nome', 'email', 'telefone'] },
  },

	 async onRun({ node, input }) {
		 return { output: { formConfig: node.config ?? {}, input } }
	 },
}
