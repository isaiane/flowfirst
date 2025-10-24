import { prisma } from '@/lib/db'
import type { Prisma } from '@prisma/client'
import { FlowDefinition, FlowEdge, FlowNode, RunContext } from '@/lib/services/types'
import { services } from '@/lib/services'
import { withRetry, withTimeout, circuitCanRun, circuitOnResult } from '@/lib/engine/resilience'
import { recordStat, emitEvent } from '@/lib/telemetry'
import crypto from 'node:crypto'

function outsFor(nodeId: string, edges?: FlowEdge[]) {
  return (edges ?? []).filter(e => e.from === nodeId)
}

function resolveNextNode({
  node,
  edges,
  route,
  fallbackNext,
}: {
  node: FlowNode
  edges?: FlowEdge[]
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

export async function executeFlow(flowId: string, input?: unknown) {
  const flow = await prisma.flow.findUnique({ where: { id: flowId } })
  if (!flow) throw new Error('Flow não encontrado')

  const definition = flow.definition as unknown as FlowDefinition
  const nodeMap = new Map<string, FlowNode>((definition.nodes ?? []).map(n => [n.id, n]))

  const execution = await prisma.flowExecution.create({
    data: { flowId, status: 'RUNNING', input: input ?? {}, startedAt: new Date() },
  })

  const ctx: RunContext = {
    executionId: execution.id,
    flowId,
    bag: {},
  }

  let currentId: string | null = definition.start
  let lastOutput: unknown = input ?? {}

  try {
    await emitEvent(flow.workspaceId, 'execution.started', { executionId: execution.id, flowId })
    while (currentId) {
      const node = nodeMap.get(currentId)
      if (!node) throw new Error(`Node '${currentId}' não encontrado`)

      await emitEvent(flow.workspaceId, 'node.started', { executionId: execution.id, nodeId: node.id, type: node.type })
      await log(execution.id, 'INFO', `Executando node ${node.id}`, { type: node.type })

      const service = services[node.type]
      if (!service) {
        throw new Error(`Serviço '${node.type}' não registrado`)
      }

      // Resilience config (service defaults + node overrides)
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

      const can = await circuitCanRun(flow.workspaceId, node.id)
      if (!can.allow) {
        await log(execution.id, 'WARN', `Circuit open para ${node.id}`, { reason: can.reason })
        throw new Error(`circuit-open:${node.id}`)
      }

      const started = Date.now()
      let ok = false
      let output: any = undefined
      let route: string | null | undefined = undefined
      let next: string | null | undefined = undefined
      let wait: any = undefined

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
        output = result?.output
        route = (result as any)?.route
        next = (result as any)?.next
        wait = (result as any)?.wait
        ok = true
      } finally {
        const ms = Date.now() - started
        await recordStat({ workspaceId: flow.workspaceId, nodeId: node.id, serviceKey: service.key, ms, ok })
        await circuitOnResult({ workspaceId: flow.workspaceId, nodeId: node.id, serviceKey: service.key, ok, failureThreshold: rconf.circuit?.failureThreshold ?? 5 })
      }

      if (wait?.kind === 'form') {
        const token = crypto.randomUUID()
        const resumeNext = wait.resumeNext ?? resolveNextNode({ node, edges: definition.edges, route, fallbackNext: next ?? node.next ?? null })
        const publicUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/public/${token}`

        await prisma.waitToken.create({
          data: {
            token,
            executionId: execution.id,
            nodeId: node.id,
            resumeNext,
            fields: (wait.payload ?? {}) as Prisma.InputJsonValue,
            contextBag: ctx.bag as unknown as Prisma.InputJsonValue,
          },
        })

        await prisma.flowExecution.update({
          where: { id: execution.id },
          data: { status: 'WAITING' },
        })

        await log(execution.id, 'INFO', 'Execução pausada. Aguardando input do formulário.', { token, publicUrl, resumeNext })
        await emitEvent(flow.workspaceId, 'execution.waiting', { executionId: execution.id, token, publicUrl, nodeId: node.id, resumeNext })

        return { executionId: execution.id, waiting: { token, publicUrl, resumeNext } }
      }

      if (typeof output !== 'undefined') { ctx.bag[node.id] = output; lastOutput = output }

      currentId = resolveNextNode({ node, edges: definition.edges, route, fallbackNext: next ?? node.next ?? null })

      await emitEvent(flow.workspaceId, 'node.succeeded', { executionId: execution.id, nodeId: node.id, ms: Date.now() - started })
    }

    await prisma.flowExecution.update({
      where: { id: execution.id },
      data: {
        status: 'SUCCESS',
        result: { bag: ctx.bag, lastOutput } as Prisma.InputJsonValue,
        finishedAt: new Date(),
      },
    })

    await log(execution.id, 'INFO', 'Fluxo finalizado com sucesso', {
      lastOutput,
    })
    await emitEvent(flow.workspaceId, 'execution.finished', { executionId: execution.id, status: 'SUCCESS' })

    return { executionId: execution.id, result: lastOutput, bag: ctx.bag }
  } catch (err: any) {
    await prisma.flowExecution.update({
      where: { id: execution.id },
      data: {
        status: 'FAILED',
        result: { error: err?.message ?? String(err) },
        finishedAt: new Date(),
      },
    })
    await log(execution.id, 'ERROR', 'Falha na execução', {
      error: String(err?.message ?? err),
    })
    await emitEvent(flow.workspaceId, 'execution.finished', { executionId: execution.id, status: 'FAILED', error: String(err?.message ?? err) })
    throw err
  }
}

async function log(
  executionId: string,
  level: 'INFO' | 'WARN' | 'ERROR',
  message: string,
  data?: unknown,
) {
  await prisma.flowLog.create({
    data: { executionId, level, message, data: data as Prisma.InputJsonValue },
  })
}


