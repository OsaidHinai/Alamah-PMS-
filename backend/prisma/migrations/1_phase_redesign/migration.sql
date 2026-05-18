-- Add new CardStatus enum values
ALTER TYPE "CardStatus" ADD VALUE IF NOT EXISTS 'GOALS_SUBMITTED';
ALTER TYPE "CardStatus" ADD VALUE IF NOT EXISTS 'GOALS_APPROVED';
ALTER TYPE "CardStatus" ADD VALUE IF NOT EXISTS 'REVIEW_SUBMITTED';
ALTER TYPE "CardStatus" ADD VALUE IF NOT EXISTS 'MANAGER_REVIEWED';

-- Add phase dates to performance_cycles
ALTER TABLE "performance_cycles" ADD COLUMN IF NOT EXISTS "phase1_start" TIMESTAMP(3);
ALTER TABLE "performance_cycles" ADD COLUMN IF NOT EXISTS "phase1_end" TIMESTAMP(3);
ALTER TABLE "performance_cycles" ADD COLUMN IF NOT EXISTS "phase2_start" TIMESTAMP(3);
ALTER TABLE "performance_cycles" ADD COLUMN IF NOT EXISTS "phase2_end" TIMESTAMP(3);

-- Add manager comment to performance_cards
ALTER TABLE "performance_cards" ADD COLUMN IF NOT EXISTS "goals_manager_comment" TEXT;

-- Create next_cycle_goals table
CREATE TABLE IF NOT EXISTS "next_cycle_goals" (
    "id" TEXT NOT NULL,
    "card_id" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "title_ar" TEXT NOT NULL,
    "title_en" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "next_cycle_goals_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "next_cycle_goals" ADD CONSTRAINT "next_cycle_goals_card_id_fkey"
    FOREIGN KEY ("card_id") REFERENCES "performance_cards"("id") ON DELETE CASCADE ON UPDATE CASCADE;
