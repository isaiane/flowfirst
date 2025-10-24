import { prisma } from '@/lib/db'
import type { Prisma } from '@prisma/client'
import { FlowDefinition, FlowEdge, FlowNode, RunContext } from '@/lib/services/types'
import { services } from '@/lib/services'
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
    data: { flowId, status: 'RUNNING', input: input ?? {} },
  })

  const ctx: RunContext = {
    executionId: execution.id,
    flowId,
    bag: {},
  }

  let currentId: string | null = definition.start
  let lastOutput: unknown = input ?? {}

  try {
    while (currentId) {
      const node = nodeMap.get(currentId)
      if (!node) throw new Error(`Node '${currentId}' não encontrado`)

      await log(execution.id, 'INFO', `Executando node ${node.id}`, {
        type: node.type,
      })

      const service = services[node.type]
      if (!service) {
        throw new Error(`Serviço '${node.type}' não registrado`)
      }

      const { output, route, next, wait } = await service.onRun({
        node,
        input: lastOutput,
        context: ctx,
      })

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

        await log(execution.id, 'INFO', 'Execução pausada. Aguardando input do formulário.', {
          token,
          publicUrl,
          resumeNext,
        })

        return { executionId: execution.id, waiting: { token, publicUrl, resumeNext } }
      }

      if (typeof output !== 'undefined') {
        ctx.bag[node.id] = output
        lastOutput = output
      }

      currentId = resolveNextNode({ node, edges: definition.edges, route, fallbackNext: next ?? node.next ?? null })
    }

    await prisma.flowExecution.update({
      where: { id: execution.id },
      data: {
        status: 'SUCCESS',
        result: { bag: ctx.bag, lastOutput } as Prisma.InputJsonValue,
      },
    })

    await log(execution.id, 'INFO', 'Fluxo finalizado com sucesso', {
      lastOutput,
    })

    return { executionId: execution.id, result: lastOutput, bag: ctx.bag }
  } catch (err: any) {
    await prisma.flowExecution.update({
      where: { id: execution.id },
      data: {
        status: 'FAILED',
        result: { error: err?.message ?? String(err) },
      },
    })
    await log(execution.id, 'ERROR', 'Falha na execução', {
      error: String(err?.message ?? err),
    })
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


