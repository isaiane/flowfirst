import { prisma } from '@/lib/db'

export function withTimeout<T>(p: Promise<T>, ms: number, label = 'op'): Promise<T> {
  if (!ms || ms <= 0) return p
  return new Promise<T>((resolve, reject) => {
    const id = setTimeout(() => reject(new Error(`${label} timeout after ${ms}ms`)), ms)
    p.then(v => { clearTimeout(id); resolve(v) })
     .catch(e => { clearTimeout(id); reject(e) })
  })
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)) }
function jitter(n: number) { return Math.round(n * (0.8 + Math.random() * 0.4)) }

export async function withRetry<T>({
  attemptFn,
  maxAttempts,
  baseMs = 300,
  maxMs = 8000,
  label = 'op',
}: {
  attemptFn: (attempt: number) => Promise<T>
  maxAttempts: number
  baseMs?: number
  maxMs?: number
  label?: string
}): Promise<T> {
  let lastErr: any
  for (let attempt = 1; attempt <= Math.max(1, maxAttempts); attempt++) {
    try {
      return await attemptFn(attempt)
    } catch (e) {
      lastErr = e
      if (attempt >= maxAttempts) break
      const backoff = Math.min(maxMs, baseMs * 2 ** (attempt - 1))
      await sleep(jitter(backoff))
    }
  }
  throw lastErr ?? new Error(`${label} failed after ${maxAttempts} attempts`)
}

export type CircuitDecision = { allow: boolean, reason?: string }

export async function circuitCanRun(workspaceId: string, nodeId: string): Promise<CircuitDecision> {
  const h = await prisma.serviceHealth.findUnique({ where: { workspaceId_nodeId: { workspaceId, nodeId } } })
  if (!h) return { allow: true }
  if (h.state === 'OPEN') {
    const coolMs = 60000
    if (!h.openedAt) return { allow: false, reason: 'open-no-openedAt' }
    if (Date.now() - new Date(h.openedAt).getTime() >= coolMs) {
      await prisma.serviceHealth.update({ where: { workspaceId_nodeId: { workspaceId, nodeId } }, data: { state: 'HALF_OPEN' } })
      return { allow: true, reason: 'half-open' }
    }
    return { allow: false, reason: 'open-cooldown' }
  }
  return { allow: true }
}

export async function circuitOnResult(args: {
  workspaceId: string
  nodeId: string
  serviceKey: string
  ok: boolean
  failureThreshold?: number
  cooldownMs?: number
}) {
  const {
    workspaceId, nodeId, serviceKey, ok,
    failureThreshold = 5,
  } = args

  const now = new Date()
  const h = await prisma.serviceHealth.upsert({
    where: { workspaceId_nodeId: { workspaceId, nodeId } },
    update: {},
    create: { workspaceId, nodeId, serviceKey, state: 'CLOSED', failures: 0 },
  })

  if (ok) {
    await prisma.serviceHealth.update({
      where: { workspaceId_nodeId: { workspaceId, nodeId } },
      data: { failures: 0, state: 'CLOSED', openedAt: null, lastFailure: null },
    })
    return
  }

  const newFailures = (h.failures ?? 0) + 1
  if (newFailures >= failureThreshold || h.state === 'HALF_OPEN') {
    await prisma.serviceHealth.update({
      where: { workspaceId_nodeId: { workspaceId, nodeId } },
      data: { state: 'OPEN', failures: newFailures, lastFailure: now, openedAt: now },
    })
  } else {
    await prisma.serviceHealth.update({
      where: { workspaceId_nodeId: { workspaceId, nodeId } },
      data: { state: 'CLOSED', failures: newFailures, lastFailure: now },
    })
  }
}


