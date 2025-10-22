import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireMembership } from '@/lib/guard'
import { FlowDefinition } from '@/lib/services/types'
import type { Prisma } from '@prisma/client'

type Params = { params: Promise<{ workspaceId: string }> }

export async function POST(req: NextRequest, ctx: Params) {
  const { workspaceId } = await ctx.params
  const authz = await requireMembership(workspaceId)
  if ('error' in authz) return authz.error

  const { kind } = await req.json().catch(() => ({ kind: 'demo' }))

  let def: FlowDefinition = { start: 'node-1', nodes: [] }
  let name = 'Blank'

  if (kind === 'demo') {
    name = 'Demo Webhook'
    def = {
      start: 'node-1',
      nodes: [
        {
          id: 'node-1',
          type: 'webhook',
          label: 'Webhook inicial',
          config: { url: 'https://httpbin.org/post', method: 'POST', body: { hello: 'flowfirst' } },
          next: null,
        },
      ],
    }
  }

  const flow = await prisma.flow.create({
    data: { name, definition: def as Prisma.InputJsonValue, workspaceId },
    select: { id: true, name: true },
  })
  return NextResponse.json({ flow })
}


