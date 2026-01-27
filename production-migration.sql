-- Add User table
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

-- Add unique constraints to users
CREATE UNIQUE INDEX "users_supabaseId_key" ON "users"("supabaseId");
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- Add userId column to tasks table
ALTER TABLE "tasks" ADD COLUMN "userId" TEXT;

-- Add userId column to prospects table
ALTER TABLE "prospects" ADD COLUMN "userId" TEXT;

-- Add userId column to accounts table
ALTER TABLE "accounts" ADD COLUMN "userId" TEXT;

-- Add userId column to emails table
ALTER TABLE "emails" ADD COLUMN "userId" TEXT;

-- Add userId column to calls table
ALTER TABLE "calls" ADD COLUMN "userId" TEXT;

-- Drop old unique constraints
DROP INDEX IF EXISTS "prospects_email_key";
DROP INDEX IF EXISTS "accounts_name_key";

-- Add new composite unique constraints
CREATE UNIQUE INDEX "prospects_userId_email_key" ON "prospects"("userId", "email");
CREATE UNIQUE INDEX "accounts_userId_name_key" ON "accounts"("userId", "name");

-- Add indexes for performance
CREATE INDEX "tasks_userId_idx" ON "tasks"("userId");
CREATE INDEX "prospects_userId_idx" ON "prospects"("userId");
CREATE INDEX "accounts_userId_idx" ON "accounts"("userId");
CREATE INDEX "emails_userId_idx" ON "emails"("userId");
CREATE INDEX "calls_userId_idx" ON "calls"("userId");

-- Add foreign key constraints (we'll make userId required after setting values)
-- Note: We can't add NOT NULL constraint yet because existing rows don't have userId
