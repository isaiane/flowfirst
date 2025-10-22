import { FlowService } from './types'

export const FormService: FlowService = {
	 key: 'form',
	 label: 'Form',

	 async onRun({ node, input }) {
		 return { output: { formConfig: node.config ?? {}, input } }
	 },
}
