import { z } from 'zod'

export const webhookSchema = z.object({
  url: z.string().url(),
  method: z.enum(['GET', 'POST', 'PUT', 'PATCH']).default('POST'),
  headers: z.record(z.string()).optional(),
  body: z.any().optional(),
})

export const decisionSchema = z.object({
  source: z.enum(['lastOutput', 'bag']).optional(),
  bagKey: z.string().optional(),
  defaultRoute: z.string().optional().nullable(),
  rules: z.array(z.object({
    when: z.object({
      path: z.string().min(1),
      op: z.enum(['eq','neq','gt','lt','gte','lte']),
      value: z.any(),
    }),
    route: z.string().optional(),
    next: z.string().optional(),
  })).min(1, 'Defina ao menos uma regra'),
})

export const formSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  fields: z.array(z.string()).default([]),
})

export const serviceSchemas: Record<string, any> = {
  webhook: webhookSchema,
  decision: decisionSchema,
  form: formSchema,
}


