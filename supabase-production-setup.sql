-- ============================================
-- PRODUCTION DATABASE SETUP
-- This will reset and recreate all tables with auth
-- ============================================

-- Step 1: Drop all existing tables
DROP TABLE IF EXISTS "Event" CASCADE;
DROP TABLE IF EXISTS "calls" CASCADE;
DROP TABLE IF EXISTS "emails" CASCADE;
DROP TABLE IF EXISTS "accounts" CASCADE;
DROP TABLE IF EXISTS "prospects" CASCADE;
DROP TABLE IF EXISTS "tasks" CASCADE;
DROP TABLE IF EXISTS "users" CASCADE;

-- Drop all enums
DROP TYPE IF EXISTS "CallOutcome" CASCADE;
DROP TYPE IF EXISTS "CallStatus" CASCADE;
DROP TYPE IF EXISTS "EmailStatus" CASCADE;
DROP TYPE IF EXISTS "EmailType" CASCADE;
DROP TYPE IF EXISTS "AccountStatus" CASCADE;
DROP TYPE IF EXISTS "ProspectStatus" CASCADE;
DROP TYPE IF EXISTS "EventType" CASCADE;
DROP TYPE IF EXISTS "TaskPriority" CASCADE;
DROP TYPE IF EXISTS "TaskStatus" CASCADE;
DROP TYPE IF EXISTS "TaskType" CASCADE;

-- Step 2: Create all enums
CREATE TYPE "TaskType" AS ENUM ('hot_lead', 'interested', 'website_visit', 'follow_up', 'other');
CREATE TYPE "TaskStatus" AS ENUM ('to_do', 'in_progress', 'done');
CREATE TYPE "TaskPriority" AS ENUM ('high', 'medium', 'low');
CREATE TYPE "EventType" AS ENUM ('email_sent', 'call_started', 'call_completed');
CREATE TYPE "ProspectStatus" AS ENUM ('new_lead', 'in_sequence', 'contacted', 'meeting_scheduled', 'qualified', 'unqualified');
CREATE TYPE "AccountStatus" AS ENUM ('new_lead', 'in_sequence', 'contacted', 'meeting_scheduled', 'customer', 'churned');
CREATE TYPE "EmailType" AS ENUM ('one_off', 'sequence', 'priority', 'template');
CREATE TYPE "EmailStatus" AS ENUM ('draft', 'scheduled', 'sending', 'sent', 'failed', 'bounced');
CREATE TYPE "CallStatus" AS ENUM ('queued', 'ringing', 'in_progress', 'completed', 'failed', 'busy', 'no_answer', 'canceled');
CREATE TYPE "CallOutcome" AS ENUM ('connected', 'voicemail', 'no_answer', 'busy', 'failed', 'gatekeeper');

-- Step 3: Create all tables with userId
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "supabaseId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "avatarUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "tasks" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" "TaskType" NOT NULL,
    "status" "TaskStatus" NOT NULL,
    "priority" "TaskPriority" NOT NULL,
    "dueDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "contact" JSONB,
    "company" JSONB,
    "userId" TEXT NOT NULL,
    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "type" "EventType" NOT NULL,
    "taskId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "meta" JSONB,
    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "prospects" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "title" TEXT,
    "company" TEXT,
    "phone" TEXT,
    "location" TEXT,
    "linkedin" TEXT,
    "status" "ProspectStatus" NOT NULL DEFAULT 'new_lead',
    "sequence" TEXT,
    "sequenceStep" TEXT,
    "pdlData" JSONB,
    "lastActivity" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    CONSTRAINT "prospects_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "industry" TEXT,
    "location" TEXT,
    "website" TEXT,
    "employees" INTEGER,
    "status" "AccountStatus" NOT NULL DEFAULT 'new_lead',
    "sequence" TEXT,
    "sequenceStep" TEXT,
    "lastActivity" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "contacts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "emails" (
    "id" TEXT NOT NULL,
    "to" TEXT NOT NULL,
    "cc" TEXT,
    "bcc" TEXT,
    "from" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "bodyText" TEXT NOT NULL,
    "bodyHtml" TEXT,
    "prospectId" TEXT,
    "accountId" TEXT,
    "templateId" TEXT,
    "emailType" "EmailType" NOT NULL DEFAULT 'one_off',
    "status" "EmailStatus" NOT NULL DEFAULT 'draft',
    "sendgridId" TEXT,
    "scheduledFor" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "openedAt" TIMESTAMP(3),
    "clickedAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    CONSTRAINT "emails_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "calls" (
    "id" TEXT NOT NULL,
    "from" TEXT NOT NULL,
    "to" TEXT NOT NULL,
    "prospectId" TEXT,
    "accountId" TEXT,
    "twilioSid" TEXT,
    "status" "CallStatus" NOT NULL DEFAULT 'queued',
    "outcome" "CallOutcome",
    "duration" INTEGER,
    "recordingUrl" TEXT,
    "transcription" TEXT,
    "notes" TEXT,
    "failureReason" TEXT,
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    CONSTRAINT "calls_pkey" PRIMARY KEY ("id")
);

-- Step 4: Create indexes
CREATE UNIQUE INDEX "users_supabaseId_key" ON "users"("supabaseId");
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE INDEX "tasks_userId_idx" ON "tasks"("userId");
CREATE INDEX "prospects_userId_idx" ON "prospects"("userId");
CREATE UNIQUE INDEX "prospects_userId_email_key" ON "prospects"("userId", "email");
CREATE INDEX "accounts_userId_idx" ON "accounts"("userId");
CREATE UNIQUE INDEX "accounts_userId_name_key" ON "accounts"("userId", "name");
CREATE INDEX "emails_userId_idx" ON "emails"("userId");
CREATE UNIQUE INDEX "calls_twilioSid_key" ON "calls"("twilioSid");
CREATE INDEX "calls_userId_idx" ON "calls"("userId");

-- Step 5: Add foreign keys
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Event" ADD CONSTRAINT "Event_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "prospects" ADD CONSTRAINT "prospects_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "emails" ADD CONSTRAINT "emails_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "calls" ADD CONSTRAINT "calls_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
