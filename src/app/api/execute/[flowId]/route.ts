import { NextResponse } from 'next/server'
import { executeFlow } from '@/lib/engine/executeFlow'

type Params = { params: { flowId: string } }

export async function POST(_req: Request, { params }: Params) {
  try {
    const { flowId } = params
    const result = await executeFlow(flowId, { trigger: 'manual' })
    return NextResponse.json({ ok: true, ...result })
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? String(e) },
      { status: 400 },
    )
  }
}


