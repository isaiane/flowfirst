import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireMembership } from '@/lib/guard'

export async function GET(_req: Request, { params }: { params: { workspaceId: string } }) {
  const authz = await requireMembership(params.workspaceId)
  if ('error' in authz) return authz.error
  const hooks = await prisma.eventWebhook.findMany({ where: { workspaceId: params.workspaceId } })
  return NextResponse.json({ hooks })
}

export async function POST(req: Request, { params }: { params: { workspaceId: string } }) {
  const authz = await requireMembership(params.workspaceId)
  if ('error' in authz) return authz.error
  const { url, secret } = await req.json()
  if (!url || !secret) return NextResponse.json({ error: 'missing' }, { status: 400 })
  const hook = await prisma.eventWebhook.create({ data: { workspaceId: params.workspaceId, url, secret } })
  return NextResponse.json({ hook })
}
