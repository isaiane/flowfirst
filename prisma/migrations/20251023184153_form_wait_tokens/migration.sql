-- AlterEnum
ALTER TYPE "ExecStatus" ADD VALUE 'WAITING';

-- CreateTable
CREATE TABLE "WaitToken" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "executionId" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "resumeNext" TEXT,
    "fields" JSONB NOT NULL,
    "contextBag" JSONB NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WaitToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WaitToken_token_key" ON "WaitToken"("token");

-- AddForeignKey
ALTER TABLE "WaitToken" ADD CONSTRAINT "WaitToken_executionId_fkey" FOREIGN KEY ("executionId") REFERENCES "flow_executions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

