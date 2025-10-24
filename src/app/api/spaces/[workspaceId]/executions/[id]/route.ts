import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireMembership } from '@/lib/guard'

type P = { params: { workspaceId: string; id: string } }

export async function GET(_req: Request, { params }: P) {
  const authz = await requireMembership(params.workspaceId)
  if ('error' in authz) return authz.error

  const exec = await prisma.flowExecution.findUnique({
    where: { id: params.id },
    include: { flow: { select: { name: true } } },
  })
  if (!exec) return NextResponse.json({ error: 'not-found' }, { status: 404 })

  const logs = await prisma.flowLog.findMany({
    where: { executionId: exec.id },
    orderBy: { timestamp: 'asc' },
  })

  return NextResponse.json({ execution: exec, logs })
}


