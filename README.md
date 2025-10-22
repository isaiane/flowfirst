# FlowFirst (Fase 1)

## Setup
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
