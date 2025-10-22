import { prisma } from '@/lib/db'
import type { Prisma } from '@prisma/client'
import { FlowDefinition, FlowNode, RunContext } from '@/lib/services/types'
import { services } from '@/lib/services'

export async function executeFlow(flowId: string, input?: unknown) {
  const flow = await prisma.flow.findUnique({ where: { id: flowId } })
  if (!flow) throw new Error('Flow não encontrado')

  const definition = flow.definition as unknown as FlowDefinition
  const nodeMap = new Map<string, FlowNode>(
    (definition.nodes ?? []).map(n => [n.id, n]),
  )

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

      const { output } = await service.onRun({
        node,
        input: lastOutput,
        context: ctx,
      })

      ctx.bag[node.id] = output
      lastOutput = output

      currentId = node.next ?? null
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


