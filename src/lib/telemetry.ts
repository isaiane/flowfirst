import { prisma } from '@/lib/db'
import crypto from 'node:crypto'

export async function recordStat({
  workspaceId, nodeId, serviceKey, ms, ok,
}: { workspaceId: string, nodeId: string, serviceKey: string, ms: number, ok: boolean }) {
  const s = await prisma.serviceStat.upsert({
    where: { workspaceId_nodeId: { workspaceId, nodeId } },
    update: {},
    create: { workspaceId, nodeId, serviceKey },
  })
  const executions = (s.executions ?? 0) + 1
  const successes = (s.successes ?? 0) + (ok ? 1 : 0)
  const failures = (s.failures ?? 0) + (ok ? 0 : 1)
  const p50 = s.p50Ms ? Math.round(s.p50Ms * 0.9 + ms * 0.1) : ms
  const p95 = s.p95Ms ? Math.max(s.p95Ms * 0.9, ms) : ms

  await prisma.serviceStat.update({
    where: { workspaceId_nodeId: { workspaceId, nodeId } },
    data: { executions, successes, failures, p50Ms: p50, p95Ms: p95, lastMs: ms },
  })
}

export type EventName =
  | 'execution.started'
  | 'execution.finished'
  | 'execution.waiting'
  | 'node.started'
  | 'node.succeeded'
  | 'node.failed'

export async function emitEvent(workspaceId: string, name: EventName, payload: any) {
  const hooks = await prisma.eventWebhook.findMany({ where: { workspaceId, isActive: true } })
  if (!hooks.length) return
  const body = JSON.stringify({ name, payload, ts: new Date().toISOString() })
  await Promise.allSettled(hooks.map(async (h) => {
    const sig = crypto.createHmac('sha256', h.secret).update(body).digest('hex')
    await fetch(h.url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-FlowFirst-Signature': sig }, body })
  }))
}


