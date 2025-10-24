import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireMembership } from '@/lib/guard'

export async function GET(_req: Request, { params }: { params: { workspaceId: string } }) {
  const authz = await requireMembership(params.workspaceId)
  if ('error' in authz) return authz.error
  const stats = await prisma.serviceStat.findMany({ where: { workspaceId: params.workspaceId } })
  const health = await prisma.serviceHealth.findMany({ where: { workspaceId: params.workspaceId } })
  return NextResponse.json({ stats, health })
}


