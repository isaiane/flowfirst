import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function requireMembership(workspaceId: string) {
  if (process.env.E2E_BYPASS === '1') {
    return { user: { id: 'e2e', email: 'e2e@example.com' } as any, member: { id: 'e2e-m', role: 'OWNER' } as any }
  }
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return { error: NextResponse.json({ error: 'unauthenticated' }, { status: 401 }) }
  }
  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user) {
    return { error: NextResponse.json({ error: 'user-not-found' }, { status: 401 }) }
  }
  const member = await prisma.membership.findUnique({
    where: { userId_workspaceId: { userId: user.id, workspaceId } },
  })
  if (!member) {
    return { error: NextResponse.json({ error: 'forbidden' }, { status: 403 }) }
  }
  return { user, member }
}


