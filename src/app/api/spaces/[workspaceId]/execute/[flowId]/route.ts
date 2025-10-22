import { NextRequest, NextResponse } from 'next/server'
import { requireMembership } from '@/lib/guard'
import { prisma } from '@/lib/db'
import { executeFlow } from '@/lib/engine/executeFlow'

type P = { params: Promise<{ workspaceId: string; flowId: string }> }

export async function POST(_req: NextRequest, ctx: P) {
  const { workspaceId, flowId } = await ctx.params
  const authz = await requireMembership(workspaceId)
  if ('error' in authz) return authz.error

  const flow = await prisma.flow.findFirst({ where: { id: flowId, workspaceId } })
  if (!flow) return NextResponse.json({ ok: false, error: 'flow-not-found' }, { status: 404 })

  try {
    const result = await executeFlow(flowId, { trigger: 'manual' })
    return NextResponse.json({ ok: true, ...result })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? String(e) }, { status: 400 })
  }
}


