# FlowFirst — Fase 4 (Form público + Copilot v0)

## Requisitos e Setup
1. Banco Postgres acessível e `DATABASE_URL` definido em `.env.local`.
2. Instalar deps e gerar client:
   - `npm i`
   - `npx prisma generate`
3. Aplicar migrações (inclui Auth/Workspaces e WaitToken):
   - `npx prisma migrate dev -n init` (se for primeira vez)
   - `npx prisma migrate dev -n auth_workspaces`
   - `npx prisma migrate dev -n form_wait_tokens`
4. Subir o dev server:
   - `npm run dev`

## Variáveis de ambiente
Crie/ajuste `.env.local` com:
```
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DB?schema=public"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="uma-string-aleatoria-bem-grande"

# Login por e‑mail (SMTP)
EMAIL_HOST=smtp.seu-provedor.com
EMAIL_PORT=587
EMAIL_USER=seu_user
EMAIL_PASS=seu_pass
EMAIL_FROM="SaaS Platform <no-reply@saas.com>"

# URL pública (usada no link do formulário)
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Opcional (Copilot v0)
OPENAI_API_KEY="sk-..."
```

## Entregas desta fase
- Execução com pausa e retomada (WAITING/WaitToken; engine wait/resume; FormService retorna `waiting.publicUrl`).
- Formulário público (sem auth): API `GET/POST /api/public/[token]` + página `/public/[token]`.
- Copilot v0: `POST /api/copilot` — JSON de fluxo (fallback sem chave; OpenAI se houver `OPENAI_API_KEY`).
- Auth + Workspaces (Fase 3) já integrados nas rotas namespaced.

## Rotas principais
- Namespaced por workspace (auth + membership):
  - `POST /api/spaces/[workspaceId]/flows` (kind: `blank|demo`)
  - `GET/PUT /api/spaces/[workspaceId]/flows/[id]`
  - `POST /api/spaces/[workspaceId]/execute/[flowId]`
- Público (sem auth):
  - `GET /api/public/[token]` → metadados do formulário
  - `POST /api/public/[token]` → submete e retoma execução
- Copilot v0:
  - `POST /api/copilot` → `{ flow: { start, nodes: [...] }, note? }`

## Páginas
- `/signin` — Entrar (GitHub/Email)
- `/workspaces` — listar/criar workspaces
- `/space/[workspaceId]/flows` — listar/criar flows do workspace e abrir no Builder
- `/space/[workspaceId]/flow-builder?flowId=...` — builder do flow
- `/public/[token]` — formulário público (render pelo token)
- `/services` — catálogo dos serviços (meta)

## Como testar no navegador (passo a passo)
1. Faça login em `/signin` (GitHub/email) e vá para `/workspaces`.
2. Crie um workspace → redireciona para `/space/[id]/flows`.
3. Crie um Flow (ou Demo) e abra no Builder.
4. Monte o fluxo: Form → Webhook.
   - Selecione o node Form e configure `title/description/fields`.
   - Conecte `Form.next` ao `Webhook`.
   - Selecione o node Webhook e defina `url` (ex.: `https://httpbin.org/post`) e método.
   - Clique Salvar.
5. Clique Executar.
   - A resposta (DevTools → Network) deve conter `waiting.publicUrl`.
6. Abra `waiting.publicUrl` em aba anônima e envie o formulário.
   - A execução deve retomar e finalizar com SUCCESS.
7. Valide no banco (`npx prisma studio`):
   - `FlowExecution.status`: WAITING → SUCCESS
   - `FlowLog`: pausa e retomada
   - `WaitToken.consumedAt`: preenchido

## Copilot v0 (rápido)
Via console do navegador:
```
fetch('/api/copilot',{
  method:'POST',headers:{'Content-Type':'application/json'},
  body: JSON.stringify({ prompt:'capturar lead e enviar ao CRM' })
}).then(r=>r.json()).then(console.log)
```
Resultado: JSON `{ flow: { start, nodes: [...] } }` (fallback se sem `OPENAI_API_KEY`).

## Testes E2E (opcionais)
- Workspace/execução (com bypass):
```
E2E_BYPASS=1 E2E_BASE_URL=http://localhost:3000 npm run e2e:workspace
```
- Branching com 2 forms:
```
E2E_BASE_URL=http://localhost:3000 npm run e2e:branch2
```
- Formulário público com retomada:
```
E2E_BYPASS=1 E2E_BASE_URL=http://localhost:3000 npm run e2e:public
```

## Notas
- Conceitos: **Workspace** (área de trabalho do time/empresa) → agrupa **Flows** (jornadas) → Builder opera por `flowId`.
- Em dev pode usar Mailhog/Mailpit para o login por e‑mail (ajuste `EMAIL_HOST/PORT`).

 
