import { FlowNode, FlowService } from './types'

type Rule = {
	 when: { path: string; op: 'eq' | 'neq' | 'gt' | 'lt' | 'gte' | 'lte'; value: any }
	 next: string
}

type DecisionConfig = {
	 rules: Rule[]
	 defaultNext?: string | null
	 source?: 'lastOutput' | 'bag'
	 bagKey?: string
}

function getByPath(obj: any, path: string) {
	 return path.split('.').reduce((acc, key) => (acc ? acc[key] : undefined), obj)
}

function compare(op: Rule['when']['op'], a: any, b: any) {
	 switch (op) {
		 case 'eq': return a === b
		 case 'neq': return a !== b
		 case 'gt': return a > b
		 case 'lt': return a < b
		 case 'gte': return a >= b
		 case 'lte': return a <= b
		 default: return false
	 }
}

export const DecisionService: FlowService = {
	 key: 'decision',
	 label: 'Decision',
  meta: {
    description: 'Avaliador condicional com regras simples que define o próximo nó.',
    inputs: ['Objeto de contexto (input/última saída ou bag)'],
    outputs: ['{ matched: Rule | null }'],
    example: { rules: [{ when: { path: 'status', op: 'eq', value: 200 }, next: 'node-2' }], defaultNext: null },
  },

	 async onRun({ node, input, context }) {
		 const cfg = (node.config ?? {}) as DecisionConfig
		 const rules = cfg.rules ?? []
		 let sourceObj: any = input

		 if (cfg.source === 'bag') {
			 sourceObj = cfg.bagKey ? (context.bag as any)[cfg.bagKey] : context.bag
		 }

		 for (const r of rules) {
			 const left = getByPath(sourceObj, r.when.path)
			 if (compare(r.when.op, left, r.when.value)) {
				 return { output: { matched: r }, next: r.next }
			 }
		 }

		 return { output: { matched: null }, next: cfg.defaultNext ?? null }
	 },
}
