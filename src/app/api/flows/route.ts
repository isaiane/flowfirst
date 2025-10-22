import { NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'
import { FlowDefinition } from '@/lib/services/types'

export async function POST(req: Request) {
  const { kind } = await req.json().catch(() => ({ kind: 'demo' }))

  if (kind !== 'demo') {
    return NextResponse.json({ error: 'kind inválido' }, { status: 400 })
  }

  const def: FlowDefinition = {
    start: 'node-1',
    nodes: [
      {
        id: 'node-1',
        type: 'webhook',
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


