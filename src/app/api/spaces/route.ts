import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET() {
  if (process.env.E2E_BYPASS === '1') {
    const e2e = await prisma.user.upsert({
      where: { email: 'e2e@example.com' },
      update: {},
      create: { email: 'e2e@example.com', name: 'E2E' },
    })
    const memberships = await prisma.membership.findMany({
      where: { userId: e2e.id },
      include: { workspace: true },
      orderBy: { createdAt: 'asc' },
    })
    return NextResponse.json({ spaces: memberships.map(m => m.workspace) })
  }

  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ spaces: [] })
  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user) return NextResponse.json({ spaces: [] })
  const memberships = await prisma.membership.findMany({
    where: { userId: user.id },
    include: { workspace: true },
    orderBy: { createdAt: 'asc' },
  })
  return NextResponse.json({ spaces: memberships.map(m => m.workspace) })
}

export async function POST(req: Request) {
  let user: { id: string } | null = null
  if (process.env.E2E_BYPASS === '1') {
    const e2e = await prisma.user.upsert({
      where: { email: 'e2e@example.com' },
      update: {},
      create: { email: 'e2e@example.com', name: 'E2E' },
    })
    user = { id: e2e.id }
  } else {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
    const u = await prisma.user.findUnique({ where: { email: session.user.email } })
    if (!u) return NextResponse.json({ error: 'user-not-found' }, { status: 401 })
    user = { id: u.id }
  }

  const { name } = await req.json()
  if (!name) return NextResponse.json({ error: 'missing-name' }, { status: 400 })

  const ws = await prisma.workspace.create({
    data: {
      name,
      createdById: user.id,
      memberships: { create: { userId: user.id, role: 'OWNER' } },
    },
  })
  return NextResponse.json({ workspace: ws })
}


