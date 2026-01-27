-- Add indexes for call relations if they don't exist
CREATE INDEX IF NOT EXISTS "calls_prospectId_idx" ON "calls"("prospectId");
CREATE INDEX IF NOT EXISTS "calls_accountId_idx" ON "calls"("accountId");

-- Add foreign key constraints if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'calls_prospectId_fkey'
  ) THEN
    ALTER TABLE "calls" ADD CONSTRAINT "calls_prospectId_fkey"
      FOREIGN KEY ("prospectId") REFERENCES "prospects"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'calls_accountId_fkey'
  ) THEN
    ALTER TABLE "calls" ADD CONSTRAINT "calls_accountId_fkey"
      FOREIGN KEY ("accountId") REFERENCES "accounts"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
