import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/guard', () => ({ requireMembership: vi.fn(async () => ({ user: { id: 'u1' } })) }))
vi.mock('@/lib/db', () => ({ prisma: { flow: { findFirst: vi.fn(async ()=> ({ id: 'f1' })) } } }))
vi.mock('@/lib/engine/executeFlow', () => ({ executeFlow: vi.fn(async ()=> ({ executionId: 'e1', result: {}, bag: {} })) }))

import { POST } from './route'

describe('POST /api/spaces/[workspaceId]/execute/[flowId]', () => {
  beforeEach(() => vi.resetAllMocks())

  it('executa flow quando existe e há membership', async () => {
    const req = new Request('http://test', { method: 'POST' })
    // @ts-ignore
    const res = await POST(req, { params: Promise.resolve({ workspaceId: 'ws1', flowId: 'f1' }) })
    const json = await (res as Response).json()
    expect(json.ok).toBe(true)
    expect(json.executionId).toBe('e1')
  })
})


