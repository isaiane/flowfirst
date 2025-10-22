import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/guard', () => ({ requireMembership: vi.fn(async () => ({ user: { id: 'u1' } })) }))
vi.mock('@/lib/db', () => ({ prisma: { flow: { create: vi.fn(async (args:any)=> ({ id: 'f1', name: args.data.name })) } } }))

import { POST } from './route'

describe('POST /api/spaces/[workspaceId]/flows', () => {
  beforeEach(() => vi.resetAllMocks())

  it('cria flow blank', async () => {
    const req = new Request('http://test', { method: 'POST', body: JSON.stringify({ kind: 'blank' }) })
    // @ts-ignore
    const res = await POST(req, { params: Promise.resolve({ workspaceId: 'ws1' }) })
    const json = await (res as Response).json()
    expect(json.flow.id).toBe('f1')
  })
})


