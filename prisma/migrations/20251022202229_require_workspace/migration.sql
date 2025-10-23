-- habilite UUID se precisar (opcional)
-- CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$
DECLARE uid TEXT := (SELECT id FROM "User" ORDER BY "createdAt" LIMIT 1);
DECLARE ws_id TEXT := (SELECT id FROM "Workspace" ORDER BY "createdAt" LIMIT 1);
BEGIN
  -- garante um usuário
  IF uid IS NULL THEN
    uid := 'system-user';
    INSERT INTO "User"(id, email, "createdAt")
    VALUES (uid, 'default@system.local', NOW())
    ON CONFLICT (id) DO NOTHING;
  END IF;

  -- garante um workspace
  IF ws_id IS NULL THEN
    ws_id := 'default-workspace';
    INSERT INTO "Workspace"(id, name, "createdById", "createdAt")
    VALUES (ws_id, 'Default', uid, NOW())
    ON CONFLICT (id) DO NOTHING;
  END IF;

  -- backfill nos flows nulos
  UPDATE "flows" SET "workspaceId" = ws_id WHERE "workspaceId" IS NULL;
END$$;

ALTER TABLE "flows" ALTER COLUMN "workspaceId" SET NOT NULL;
-- Garante idempotência caso a FK já exista de migração anterior
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    WHERE tc.constraint_name = 'flows_workspaceId_fkey'
      AND tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_name = 'flows'
  ) THEN
    ALTER TABLE "flows" DROP CONSTRAINT "flows_workspaceId_fkey";
  END IF;
END $$;
ALTER TABLE "flows" ADD CONSTRAINT "flows_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;