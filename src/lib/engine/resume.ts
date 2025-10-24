import { prisma } from '@/lib/db'
import { FlowDefinition, FlowNode, RunContext } from '@/lib/services/types'
import { services } from '@/lib/services'
import type { Prisma } from '@prisma/client'

function mapNodes(def: FlowDefinition) {
  return new Map<string, FlowNode>((def.nodes ?? []).map(n => [n.id, n]))
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

  const ctx: RunContext = { executionId, flowId: exec.flowId, bag: bagSnapshot ?? {} }

  let currentId: string | null = startNodeId
  let lastOutput: unknown = input ?? {}

  while (currentId) {
    const node = nodeMap.get(currentId)
    if (!node) throw new Error(`Node '${currentId}' não encontrado`)
    const service = services[node.type]
    if (!service) throw new Error(`Serviço '${node.type}' não registrado`)
    const { output, next } = await service.onRun({ node, input: lastOutput, context: ctx })
    if (typeof output !== 'undefined') {
      ctx.bag[node.id] = output
      lastOutput = output
    }
    currentId = (next ?? node.next) ?? null
  }

  await prisma.flowExecution.update({
    where: { id: executionId },
    data: { status: 'SUCCESS', result: { bag: ctx.bag, lastOutput } as Prisma.InputJsonValue },
  })

  return { executionId, result: lastOutput, bag: ctx.bag }
}


