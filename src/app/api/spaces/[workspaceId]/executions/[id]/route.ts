import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireMembership } from '@/lib/guard'

type P = { params: Promise<{ workspaceId: string; id: string }> }

export async function GET(_req: NextRequest, ctx: P) {
  const { workspaceId, id } = await ctx.params
  const authz = await requireMembership(workspaceId)
  if ('error' in authz) return authz.error

  const exec = await prisma.flowExecution.findUnique({
    where: { id },
    include: { flow: { select: { name: true } } },
  })
  if (!exec) return NextResponse.json({ error: 'not-found' }, { status: 404 })

  const logs = await prisma.flowLog.findMany({
    where: { executionId: exec.id },
    orderBy: { timestamp: 'asc' },
  })

  return NextResponse.json({ execution: exec, logs })
}


