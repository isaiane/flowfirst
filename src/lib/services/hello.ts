import { FlowService } from './types'

export const HelloService: FlowService = {
  key: 'hello',
  label: 'Hello',
  meta: {
    description: 'Descreva o que este serviço faz.',
    inputs: ['...'],
    outputs: ['...'],
    example: {},
  },
  async onCreate(){},
  async onSave(){},
  async onDelete(){},
  async onRun({ node, input, context }) {
    return { output: { echo: input, config: node.config } }
  },
}
