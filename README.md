# FlowFirst — PoC (Fases 1–3)

## Setup (Fase 1)
1. Crie um Postgres (Neon/Render/etc) e defina `DATABASE_URL` em `.env.local`.
2. `npm i`
3. `npx prisma migrate dev -n init`
4. `npm run dev`

## Rotas úteis
- `POST /api/flows` → `{ "kind": "demo" }` cria fluxo demo.
- `POST /api/execute/:flowId` → executa e retorna `executionId`, `result`, `bag`.

## Teste rápido
1. Abra `/`.
2. Clique **Criar fluxo demo**.
3. Clique **Executar** (usa `webhook` → `httpbin.org/post`).

## Variáveis de ambiente
Crie um arquivo `.env.local` na raiz com:

```
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DB?schema=public"
```

## Deploy (Vercel)
1. Suba o repositório no GitHub.
2. Crie um projeto na Vercel e importe o repo.
3. Adicione `DATABASE_URL` como variável de ambiente (Production/Preview).
4. Rode `npx prisma migrate deploy` no primeiro deploy (Command ou script). Alternativamente, faça um deploy local das migrações e confirme que o banco está pronto.

---

# Fase 2 — Flow Builder (ReactFlow)

## Novas dependências
`npm i reactflow zustand`

## Builder
- Página: `/flow-builder` (na Fase 3 passa para `/space/[workspaceId]/flow-builder`)
- Sidebar com nodes: Webhook, Decision, Form
- Inspector para editar config do node selecionado
- Salvar → `PUT /api/flows/:id` (grava `definition` no Postgres)
- Executar → `POST /api/execute/:flowId`

### APIs adicionadas/atualizadas
- `GET /api/flows/:id` → retorna `{ flow: { id, name, definition } }`
- `PUT /api/flows/:id` body: `{ name, definition }`
- `POST /api/flows` com `{ kind: "blank" }` para criar um fluxo vazio

### Serviços
- `webhook` (funcional)
- `decision` (branching com regras simples; escolhe próximo node via retorno `next`)
- `form` (stub, apenas propaga config nesta fase)

## Testes
- Unit (Vitest): `npm run test`
- E2E demo: `npm run e2e:demo` (cria e executa fluxo webhook)
- E2E decision (branch 2 forms): `npm run e2e:branch2` (requer dev server ativo)

---

# Fase 3 — Auth + Workspaces + DX

## Novas dependências
`npm i next-auth @auth/prisma-adapter --legacy-peer-deps`

## Variáveis de ambiente (Auth)
```
GITHUB_ID="xxxx"
GITHUB_SECRET="xxxx"
NEXTAUTH_SECRET="uma-string-aleatoria-bem-grande"
NEXTAUTH_URL="http://localhost:3000"
```

## Prisma (Auth + Workspaces)
- Adicionados: `User`, `Account`, `Session`, `VerificationToken`, `Workspace`, `Membership`, `Role` e `Flow.workspaceId`.
- Migração: `npx prisma migrate dev -n auth_workspaces`

## Auth e Guard
- NextAuth: rota `GET/POST /api/auth/[...nextauth]`
- Guard: `requireMembership(workspaceId)` para proteger rotas por workspace

## APIs namespaced
- Criar flow: `POST /api/spaces/[workspaceId]/flows` (kind: demo|blank)
- Obter/Salvar flow: `GET/PUT /api/spaces/[workspaceId]/flows/[id]`
- Executar flow: `POST /api/spaces/[workspaceId]/execute/[flowId]`

## Páginas
- `/signin`: botão “Entrar com GitHub”
- `/workspaces`: listar e criar workspace (redireciona para builder)
- `/space/[workspaceId]/flow-builder`: builder sob o workspace
- `/services`: catálogo dos serviços (meta de inputs/outputs/exemplo)

## CLI (DX)
- Criar serviço: `npm run cli:add-service hello`
  - Gera `src/lib/services/hello.ts` e registra no `src/lib/services/index.ts`

## Testes E2E Fase 3
- Workspace + flow (bypass de auth):
  - `E2E_BYPASS=1 E2E_BASE_URL=http://localhost:3000 npm run e2e:workspace`
- Branching 2 forms: `E2E_BASE_URL=http://localhost:3000 npm run e2e:branch2`

## Critérios de aceitação (F3)
- Login (GitHub) funcionando e sessão persistente
- Workspaces: criação/listagem; acesso ao builder por membro
- APIs namespaced validam membership (401/403 quando não)
- Builder salva/roda fluxos sob workspace correto
- Catálogo de serviços em `/services`
- CLI `cli:add-service <Nome>` cria arquivo e registra no registry
