import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { FlowDefinition } from '@/lib/services/types'
import type { Prisma } from '@prisma/client'

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const params = await ctx.params
  const flow = await prisma.flow.findUnique({
    where: { id: params.id },
    select: { id: true, name: true, definition: true },
  })
  if (!flow) return NextResponse.json({ error: 'not-found' }, { status: 404 })
  return NextResponse.json({ flow })
}

export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const params = await ctx.params
  const body = await req.json()
  const def = body?.definition as FlowDefinition
  if (!def?.start || !Array.isArray(def?.nodes)) {
    return NextResponse.json({ error: 'invalid-definition' }, { status: 400 })
  }
  const flow = await prisma.flow.update({
    where: { id: params.id },
    data: { name: body?.name ?? 'Untitled', definition: def as Prisma.InputJsonValue },
    select: { id: true, name: true },
  })
  return NextResponse.json({ flow })
}


