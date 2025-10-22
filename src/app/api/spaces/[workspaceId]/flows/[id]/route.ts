import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireMembership } from '@/lib/guard'
import { FlowDefinition } from '@/lib/services/types'
import type { Prisma } from '@prisma/client'

type P = { params: Promise<{ workspaceId: string; id: string }> }

export async function GET(_req: NextRequest, ctx: P) {
  const { workspaceId, id } = await ctx.params
  const authz = await requireMembership(workspaceId)
  if ('error' in authz) return authz.error

  const flow = await prisma.flow.findFirst({
    where: { id, workspaceId },
    select: { id: true, name: true, definition: true },
  })
  if (!flow) return NextResponse.json({ error: 'not-found' }, { status: 404 })
  return NextResponse.json({ flow })
}

export async function PUT(req: NextRequest, ctx: P) {
  const { workspaceId, id } = await ctx.params
  const authz = await requireMembership(workspaceId)
  if ('error' in authz) return authz.error

  const body = await req.json()
  const def = body?.definition as FlowDefinition
  if (!def?.start || !Array.isArray(def?.nodes)) {
    return NextResponse.json({ error: 'invalid-definition' }, { status: 400 })
  }
  const flow = await prisma.flow.update({
    where: { id },
    data: { name: body?.name ?? 'Untitled', definition: def as Prisma.InputJsonValue },
    select: { id: true, name: true },
  })
  return NextResponse.json({ flow })
}


