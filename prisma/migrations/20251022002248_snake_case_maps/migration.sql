-- DropForeignKey
ALTER TABLE "public"."FlowExecution" DROP CONSTRAINT "FlowExecution_flowId_fkey";

-- DropForeignKey
ALTER TABLE "public"."FlowLog" DROP CONSTRAINT "FlowLog_executionId_fkey";

-- DropTable
DROP TABLE "public"."Flow";

-- DropTable
DROP TABLE "public"."FlowExecution";

-- DropTable
DROP TABLE "public"."FlowLog";

-- CreateTable
CREATE TABLE "flows" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "definition" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "flows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "flow_executions" (
    "id" TEXT NOT NULL,
    "flow_id" TEXT NOT NULL,
    "status" "ExecStatus" NOT NULL DEFAULT 'PENDING',
    "input" JSONB,
    "result" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "started_at" TIMESTAMP(3),
    "finished_at" TIMESTAMP(3),

    CONSTRAINT "flow_executions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "flow_logs" (
    "id" TEXT NOT NULL,
    "execution_id" TEXT NOT NULL,
    "level" "LogLevel" NOT NULL DEFAULT 'INFO',
    "message" TEXT NOT NULL,
    "data" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "flow_logs_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "flow_executions" ADD CONSTRAINT "flow_executions_flow_id_fkey" FOREIGN KEY ("flow_id") REFERENCES "flows"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flow_logs" ADD CONSTRAINT "flow_logs_execution_id_fkey" FOREIGN KEY ("execution_id") REFERENCES "flow_executions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

