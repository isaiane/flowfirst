import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { resumeExecution } from '@/lib/engine/resume'

type Params = { params: Promise<{ token: string }> }

export async function GET(_req: NextRequest, ctx: Params) {
  const { token } = await ctx.params
  const t = await prisma.waitToken.findUnique({ where: { token }, include: { execution: true } })
  if (!t) return NextResponse.json({ error: 'not-found' }, { status: 404 })
  if (t.consumedAt) return NextResponse.json({ error: 'already-consumed' }, { status: 410 })

  const cfg = t.fields as any
  return NextResponse.json({
    token,
    executionId: t.executionId,
    title: cfg?.title ?? 'Formulário',
    description: cfg?.description ?? '',
    fields: Array.isArray(cfg?.fields) ? cfg.fields : [],
  })
}

export async function POST(req: NextRequest, ctx: Params) {
  const { token } = await ctx.params
  const body = await req.json().catch(() => ({}))
  const data = body?.data ?? {}

  const t = await prisma.waitToken.findUnique({ where: { token } })
  if (!t) return NextResponse.json({ ok: false, error: 'not-found' }, { status: 404 })
  if (t.consumedAt) return NextResponse.json({ ok: false, error: 'already-consumed' }, { status: 410 })

  try {
    const startNodeId = t.resumeNext ?? ''
    const bag = (t.contextBag as any) ?? {}
    const result = await resumeExecution(t.executionId, startNodeId, data, bag)

    // Consome o token apenas após sucesso
    await prisma.waitToken.update({ where: { token }, data: { consumedAt: new Date() } })

    return NextResponse.json({ ok: true, resumed: true, result })
  } catch (e: any) {
    const message = typeof e?.message === 'string' ? e.message : 'internal-error'
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}


