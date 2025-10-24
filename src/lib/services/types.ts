export type RunContext = {
  executionId: string
  flowId: string
  bag: Record<string, unknown>
}

export type FlowNode = {
  id: string
  type: string
  label?: string
  position?: { x: number; y: number }
  config?: Record<string, unknown>
  next?: string | null
}

export type FlowDefinition = {
  start: string
  nodes: FlowNode[]
}

export type WaitSignal = {
  kind: 'form'
  payload: any
  resumeNext?: string | null
}

export interface FlowService {
  key: string
  label: string
  meta?: {
    description?: string
    inputs?: string[]
    outputs?: string[]
    example?: any
  }

  onCreate?(args: { flowId: string; node: FlowNode }): Promise<void> | void
  onSave?(args: { flowId: string; node: FlowNode }): Promise<void> | void
  onDelete?(args: { flowId: string; nodeId: string }): Promise<void> | void

  onRun(args: {
    node: FlowNode
    input: unknown
    context: RunContext
  }): Promise<{ output?: unknown; next?: string | null; wait?: WaitSignal }>
}

export type ServiceRegistry = Record<string, FlowService>


