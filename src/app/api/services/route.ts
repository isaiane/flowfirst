import { NextResponse } from 'next/server'
import { services } from '@/lib/services'

export async function GET() {
  const list = Object.values(services).map(s => ({ key: s.key, label: s.label, meta: s.meta ?? {} }))
  return NextResponse.json({ services: list })
}
