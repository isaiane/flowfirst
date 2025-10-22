import { WebhookService } from './webhook'
import { describe, it, afterEach, expect, vi } from 'vitest'

const originalFetch = global.fetch

describe('WebhookService.onRun', () => {
	 afterEach(() => {
		 global.fetch = originalFetch as any
	 })

	 it('faz POST com body e retorna status+json', async () => {
		 global.fetch = vi.fn(async () => ({
			 status: 200,
			 async text() {
				 return JSON.stringify({ ok: true })
			 },
		 })) as any

		 const { output } = await WebhookService.onRun({
			 node: { id: 'n1', type: 'webhook', config: { url: 'https://x', method: 'POST', body: { a: 1 } } },
			 input: { b: 2 },
			 context: { executionId: 'e', flowId: 'f', bag: {} },
		 })

		 expect(output).toEqual({ status: 200, data: { ok: true } })
	 })

	 it('GET não envia body', async () => {
		 const spy = vi.fn(async () => ({ status: 200, async text() { return '{}' } }))
		 global.fetch = spy as any

		 await WebhookService.onRun({
			 node: { id: 'n2', type: 'webhook', config: { url: 'https://x', method: 'GET' } },
			 input: undefined,
			 context: { executionId: 'e', flowId: 'f', bag: {} },
		 })

		 expect(spy).toHaveBeenCalledWith('https://x', expect.objectContaining({ method: 'GET', body: undefined }))
	 })
})
