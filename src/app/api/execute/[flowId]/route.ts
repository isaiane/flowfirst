import { NextRequest, NextResponse } from 'next/server'
import { executeFlow } from '@/lib/engine/executeFlow'

export async function POST(_req: NextRequest, ctx: { params: Promise<{ flowId: string }> }) {
  try {
    const { flowId } = await ctx.params
    const result = await executeFlow(flowId, { trigger: 'manual' })
    return NextResponse.json({ ok: true, ...result })
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? String(e) },
      { status: 400 },
    )
  }
}


