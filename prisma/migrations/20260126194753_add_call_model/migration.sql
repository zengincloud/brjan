-- CreateTable
CREATE TABLE "calls" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "from" TEXT NOT NULL,
    "to" TEXT NOT NULL,
    "prospectId" TEXT,
    "accountId" TEXT,
    "twilioSid" TEXT,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "outcome" TEXT,
    "duration" INTEGER,
    "recordingUrl" TEXT,
    "transcription" TEXT,
    "notes" TEXT,
    "failureReason" TEXT,
    "startedAt" DATETIME,
    "endedAt" DATETIME,
    "metadata" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "calls_twilioSid_key" ON "calls"("twilioSid");
