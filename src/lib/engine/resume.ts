import { prisma } from '@/lib/db'
import { FlowDefinition, FlowNode, RunContext } from '@/lib/services/types'
import { services } from '@/lib/services'
import type { Prisma } from '@prisma/client'
import { withRetry, withTimeout, circuitCanRun, circuitOnResult } from '@/lib/engine/resilience'
import { recordStat, emitEvent } from '@/lib/telemetry'

function mapNodes(def: FlowDefinition) {
  return new Map<string, FlowNode>((def.nodes ?? []).map(n => [n.id, n]))
}

function outsFor(nodeId: string, edges?: FlowDefinition['edges']) {
  return (edges ?? []).filter(e => e.from === nodeId)
}

function resolveNextNode({
  node,
  edges,
  route,
  fallbackNext,
}: {
  node: FlowNode
  edges?: FlowDefinition['edges']
  route?: string | null
  fallbackNext?: string | null
}): string | null {
  const outs = outsFor(node.id, edges)
  if (outs.length) {
    if (route) {
      const m = outs.find(e => (e.via ?? 'default') === route)
      if (m) return m.to
    }
    const d = outs.find(e => !e.via || e.via === 'default')
    if (d) return d.to
    return outs[0]?.to ?? null
  }
  return fallbackNext ?? node.next ?? null
}

export async function resumeExecution(
  executionId: string,
  startNodeId: string,
  input: unknown,
  bagSnapshot?: Record<string, unknown>,
) {
  const exec = await prisma.flowExecution.findUnique({
    where: { id: executionId },
    include: { flow: true },
  })
  if (!exec) throw new Error('Execution não encontrada')

  const definition = exec.flow.definition as unknown as FlowDefinition
  const nodeMap = mapNodes(definition)

  await prisma.flowExecution.update({ where: { id: executionId }, data: { status: 'RUNNING' } })
  await emitEvent(exec.flow.workspaceId, 'execution.started', { executionId, flowId: exec.flowId, resume: true })

  const ctx: RunContext = { executionId, flowId: exec.flowId, bag: bagSnapshot ?? {} }

  let currentId: string | null = startNodeId
  let lastOutput: unknown = input ?? {}

  while (currentId) {
    const node = nodeMap.get(currentId)
    if (!node) throw new Error(`Node '${currentId}' não encontrado`)
    const service = services[node.type]
    if (!service) throw new Error(`Serviço '${node.type}' não registrado`)

    await emitEvent(exec.flow.workspaceId, 'node.started', { executionId, nodeId: node.id, type: node.type })

    const meta = service.meta?.defaults ?? {}
    const rconf = ((node.config as any)?.resilience ?? {}) as {
      timeoutMs?: number
      retry?: { maxAttempts?: number; baseMs?: number; maxMs?: number }
      circuit?: { failureThreshold?: number; cooldownMs?: number; halfOpenMax?: number }
    }
    const timeoutMs = rconf.timeoutMs ?? meta.timeoutMs ?? 8000
    const retry = {
      maxAttempts: rconf.retry?.maxAttempts ?? meta.retry?.maxAttempts ?? 1,
      baseMs: rconf.retry?.baseMs ?? meta.retry?.baseMs ?? 300,
      maxMs: rconf.retry?.maxMs ?? meta.retry?.maxMs ?? 8000,
    }

    const can = await circuitCanRun(exec.flow.workspaceId, node.id)
    if (!can.allow) throw new Error(`circuit-open:${node.id}`)

    const started = Date.now()
    let ok = false
    let out: any = undefined
    let route: string | null | undefined = undefined
    let next: string | null | undefined = undefined

    try {
      const result = await withRetry({
        maxAttempts: retry.maxAttempts,
        baseMs: retry.baseMs,
        maxMs: retry.maxMs,
        attemptFn: async () => withTimeout(
          service.onRun({ node, input: lastOutput, context: ctx }),
          timeoutMs,
          `${node.type}#${node.id}`,
        ),
      })
      out = result?.output
      route = (result as any)?.route
      next = (result as any)?.next
      ok = true
    } finally {
      const ms = Date.now() - started
      await recordStat({ workspaceId: exec.flow.workspaceId, nodeId: node.id, serviceKey: service.key, ms, ok })
      await circuitOnResult({ workspaceId: exec.flow.workspaceId, nodeId: node.id, serviceKey: service.key, ok, failureThreshold: rconf.circuit?.failureThreshold ?? 5 })
    }

    if (typeof out !== 'undefined') {
      ctx.bag[node.id] = out
      lastOutput = out
    }
    currentId = resolveNextNode({ node, edges: definition.edges, route, fallbackNext: next ?? node.next ?? null })
    await emitEvent(exec.flow.workspaceId, 'node.succeeded', { executionId, nodeId: node.id, ms: Date.now() - started })
  }

  await prisma.flowExecution.update({
    where: { id: executionId },
    data: { status: 'SUCCESS', result: { bag: ctx.bag, lastOutput } as Prisma.InputJsonValue },
  })
  await emitEvent(exec.flow.workspaceId, 'execution.finished', { executionId, status: 'SUCCESS' })

  return { executionId, result: lastOutput, bag: ctx.bag }
}


