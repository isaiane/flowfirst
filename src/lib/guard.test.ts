import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('next-auth', async () => {
  return {
    getServerSession: vi.fn(),
  }
})

vi.mock('@/lib/db', async () => {
  return {
    prisma: {
      user: { findUnique: vi.fn() },
      membership: { findUnique: vi.fn() },
    },
  }
})

import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/db'
import { requireMembership } from './guard'

describe('requireMembership', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('retorna 401 quando não autenticado', async () => {
    ;(getServerSession as any).mockResolvedValueOnce(null)
    const res = await requireMembership('ws1')
    expect('error' in res).toBe(true)
    // @ts-ignore
    expect(res.error.status).toBe(401)
  })

  it('retorna 401 quando usuário não encontrado', async () => {
    ;(getServerSession as any).mockResolvedValueOnce({ user: { email: 'x@example.com' } })
    ;(prisma.user.findUnique as any).mockResolvedValueOnce(null)
    const res = await requireMembership('ws1')
    expect('error' in res).toBe(true)
    // @ts-ignore
    expect(res.error.status).toBe(401)
  })

  it('retorna 403 quando não é membro', async () => {
    ;(getServerSession as any).mockResolvedValueOnce({ user: { email: 'x@example.com' } })
    ;(prisma.user.findUnique as any).mockResolvedValueOnce({ id: 'u1' })
    ;(prisma.membership.findUnique as any).mockResolvedValueOnce(null)
    const res = await requireMembership('ws1')
    expect('error' in res).toBe(true)
    // @ts-ignore
    expect(res.error.status).toBe(403)
  })

  it('sucesso quando é membro', async () => {
    ;(getServerSession as any).mockResolvedValueOnce({ user: { email: 'x@example.com' } })
    ;(prisma.user.findUnique as any).mockResolvedValueOnce({ id: 'u1' })
    ;(prisma.membership.findUnique as any).mockResolvedValueOnce({ id: 'm1', role: 'OWNER' })
    const res = await requireMembership('ws1')
    expect('error' in res).toBe(false)
    // @ts-ignore
    expect(res.user.id).toBe('u1')
  })
})


