import fs from 'fs'
import path from 'path'

const nameArg = process.argv[2]
if (!nameArg) {
  console.error('Uso: pnpm cli:add-service <NomeDoServico>')
  process.exit(1)
}
const key = nameArg.trim()
const pascal = key[0].toUpperCase() + key.slice(1)

const servicesDir = path.join(process.cwd(), 'src', 'lib', 'services')
const filePath = path.join(servicesDir, `${key}.ts`)
const indexPath = path.join(servicesDir, 'index.ts')

if (fs.existsSync(filePath)) {
  console.error(`Já existe: ${filePath}`)
  process.exit(1)
}

const tpl = `import { FlowService } from './types'

export const ${pascal}Service: FlowService = {
  key: '${key}',
  label: '${pascal}',
  meta: {
    description: 'Descreva o que este serviço faz.',
    inputs: ['...'],
    outputs: ['...'],
    example: {},
  },
  async onCreate(){},
  async onSave(){},
  async onDelete(){},
  async onRun({ node, input, context }) {
    return { output: { echo: input, config: node.config } }
  },
}
`
fs.writeFileSync(filePath, tpl, 'utf8')

let index = fs.readFileSync(indexPath, 'utf8')
const importLine = `import { ${pascal}Service } from './${key}'`
if (!index.includes(importLine)) {
  index = `${importLine}\n` + index
}

const registryMatch = index.match(/export const services: ServiceRegistry = \{([\s\S]*?)\}\n?/)
if (registryMatch) {
  const before = index.slice(0, registryMatch.index as number)
  const body = registryMatch[1]
  const after = index.slice((registryMatch.index as number) + (registryMatch[0] as string).length)

  const entry = `  [${pascal}Service.key]: ${pascal}Service,`
  const newBody = body.includes(entry) ? body : `${entry}\n${body}`

  index = `${before}export const services: ServiceRegistry = {\n${newBody}}\n${after}`
} else {
  console.warn('Não encontrei o registry; adicione manualmente em src/lib/services/index.ts.')
}

fs.writeFileSync(indexPath, index, 'utf8')
console.log(`Serviço criado em ${filePath} e registrado em src/lib/services/index.ts`)
