-- CreateTable
CREATE TABLE "mock_calls" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "difficulty" TEXT NOT NULL,
    "character" TEXT NOT NULL,
    "messages" JSONB NOT NULL DEFAULT '[]',
    "score" INTEGER,
    "feedback" TEXT,
    "scoringBreakdown" JSONB,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mock_calls_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "mock_calls_userId_idx" ON "mock_calls"("userId");

-- AddForeignKey
ALTER TABLE "mock_calls" ADD CONSTRAINT "mock_calls_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
