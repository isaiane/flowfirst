export type RunContext = {
  executionId: string
  flowId: string
  bag: Record<string, unknown>
}

export type FlowNode = {
  id: string
  type: string
  config?: Record<string, unknown>
  next?: string | null
}

export type FlowDefinition = {
  start: string
  nodes: FlowNode[]
}

export interface FlowService {
  key: string
  label: string

  onCreate?(args: { flowId: string; node: FlowNode }): Promise<void> | void
  onSave?(args: { flowId: string; node: FlowNode }): Promise<void> | void
  onDelete?(args: { flowId: string; nodeId: string }): Promise<void> | void

  onRun(args: {
    node: FlowNode
    input: unknown
    context: RunContext
  }): Promise<{ output: unknown }>
}

export type ServiceRegistry = Record<string, FlowService>


