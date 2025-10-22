import { executeFlow } from './executeFlow'
import { prisma } from '@/lib/db'
import * as servicesMod from '@/lib/services'

vi.mock('@/lib/services', () => {
	 const Echo = {
		 key: 'echo',
		 label: 'Echo',
		 async onRun({ input }: any) {
			 return { output: { echoed: input } }
		 },
	 }
	 return { services: { echo: Echo } }
})

// Usa o banco real; requer DATABASE_URL setado.
describe('executeFlow', () => {
	 it('executa um fluxo linear e acumula em bag', async () => {
		 const flow = await prisma.flow.create({
			 data: {
				 name: 'Echo Flow',
				 definition: {
					 start: 'a',
					 nodes: [
						 { id: 'a', type: 'echo', next: 'b' },
						 { id: 'b', type: 'echo', next: null },
					 ],
				 },
			 },
		 })

		 const res = await executeFlow(flow.id, { hello: 'world' })
		 expect(res.bag['a']).toBeDefined()
		 expect(res.bag['b']).toBeDefined()
	 })
})
