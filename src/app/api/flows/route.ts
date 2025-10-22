import { NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'
import { FlowDefinition } from '@/lib/services/types'

export async function POST(req: Request) {
  const { kind } = await req.json().catch(() => ({ kind: 'demo' }))

  if (kind === 'blank') {
    const def: FlowDefinition = { start: 'node-1', nodes: [] }
    const flow = await prisma.flow.create({
      data: { name: 'Blank', definition: def as Prisma.InputJsonValue },
      select: { id: true, name: true },
    })
    return NextResponse.json({ flow })
  }

  const def: FlowDefinition = {
    start: 'node-1',
    nodes: [
      {
        id: 'node-1',
        type: 'webhook',
        label: 'Webhook inicial',
        config: {
          url: 'https://httpbin.org/post',
          method: 'POST',
          body: { hello: 'flowfirst' },
        },
        next: null,
      },
    ],
  }

  const flow = await prisma.flow.create({
    data: { name: 'Demo Webhook', definition: def as Prisma.InputJsonValue },
    select: { id: true, name: true },
  })

  return NextResponse.json({ flow })
}


