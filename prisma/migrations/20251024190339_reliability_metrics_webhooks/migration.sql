-- CreateEnum
CREATE TYPE "CircuitState" AS ENUM ('CLOSED', 'OPEN', 'HALF_OPEN');

-- CreateTable
CREATE TABLE "service_health" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "node_id" TEXT NOT NULL,
    "service_key" TEXT NOT NULL,
    "state" "CircuitState" NOT NULL DEFAULT 'CLOSED',
    "failures" INTEGER NOT NULL DEFAULT 0,
    "last_failure" TIMESTAMP(3),
    "opened_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_health_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_stats" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "node_id" TEXT NOT NULL,
    "service_key" TEXT NOT NULL,
    "executions" INTEGER NOT NULL DEFAULT 0,
    "successes" INTEGER NOT NULL DEFAULT 0,
    "failures" INTEGER NOT NULL DEFAULT 0,
    "p50_ms" INTEGER NOT NULL DEFAULT 0,
    "p95_ms" INTEGER NOT NULL DEFAULT 0,
    "last_ms" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_stats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_webhooks" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "secret" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_webhooks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "service_health_workspace_id_node_id_key" ON "service_health"("workspace_id", "node_id");

-- CreateIndex
CREATE UNIQUE INDEX "service_stats_workspace_id_node_id_key" ON "service_stats"("workspace_id", "node_id");
