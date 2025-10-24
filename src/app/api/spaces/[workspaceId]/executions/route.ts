import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireMembership } from '@/lib/guard'

type P = { params: { workspaceId: string } }

export async function GET(req: Request, { params }: P) {
  const authz = await requireMembership(params.workspaceId)
  if ('error' in authz) return authz.error

  const { searchParams } = new URL(req.url)
  const flowId = searchParams.get('flowId') || undefined

  const execs = await prisma.flowExecution.findMany({
    where: flowId ? { flowId } : undefined,
    orderBy: { createdAt: 'desc' },
    take: 100,
    select: { id: true, flowId: true, status: true, createdAt: true, startedAt: true, finishedAt: true },
  })
  return NextResponse.json({ executions: execs })
}


