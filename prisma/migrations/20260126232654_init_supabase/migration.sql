-- CreateEnum
CREATE TYPE "TaskType" AS ENUM ('hot_lead', 'interested', 'website_visit', 'follow_up', 'other');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('to_do', 'in_progress', 'done');

-- CreateEnum
CREATE TYPE "TaskPriority" AS ENUM ('high', 'medium', 'low');

-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('email_sent', 'call_started', 'call_completed');

-- CreateEnum
CREATE TYPE "ProspectStatus" AS ENUM ('new_lead', 'in_sequence', 'contacted', 'meeting_scheduled', 'qualified', 'unqualified');

-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('new_lead', 'in_sequence', 'contacted', 'meeting_scheduled', 'customer', 'churned');

-- CreateEnum
CREATE TYPE "EmailType" AS ENUM ('one_off', 'sequence', 'priority', 'template');

-- CreateEnum
CREATE TYPE "EmailStatus" AS ENUM ('draft', 'scheduled', 'sending', 'sent', 'failed', 'bounced');

-- CreateEnum
CREATE TYPE "CallStatus" AS ENUM ('queued', 'ringing', 'in_progress', 'completed', 'failed', 'busy', 'no_answer', 'canceled');

-- CreateEnum
CREATE TYPE "CallOutcome" AS ENUM ('connected', 'voicemail', 'no_answer', 'busy', 'failed', 'gatekeeper');

-- CreateTable
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

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "type" "EventType" NOT NULL,
    "taskId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "meta" JSONB,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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

    CONSTRAINT "prospects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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

    CONSTRAINT "emails_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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

    CONSTRAINT "calls_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "prospects_email_key" ON "prospects"("email");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_name_key" ON "accounts"("name");

-- CreateIndex
CREATE UNIQUE INDEX "calls_twilioSid_key" ON "calls"("twilioSid");

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
