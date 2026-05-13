-- CreateEnum
CREATE TYPE "Role" AS ENUM ('HR_ADMIN', 'MANAGER', 'EMPLOYEE');

-- CreateEnum
CREATE TYPE "CycleStatus" AS ENUM ('DRAFT', 'ACTIVE', 'CLOSED');

-- CreateEnum
CREATE TYPE "CardStatus" AS ENUM ('PENDING', 'EMPLOYEE_SUBMITTED', 'MANAGER_SUBMITTED', 'FINAL');

-- CreateEnum
CREATE TYPE "Quarter" AS ENUM ('Q1', 'Q3');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name_ar" TEXT NOT NULL,
    "name_en" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "manager_id" TEXT,
    "department" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "force_password_change" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "performance_cycles" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "status" "CycleStatus" NOT NULL DEFAULT 'DRAFT',
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "performance_cycles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "performance_cards" (
    "id" TEXT NOT NULL,
    "cycle_id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "status" "CardStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "performance_cards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goals" (
    "id" TEXT NOT NULL,
    "card_id" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "title_ar" TEXT NOT NULL,
    "title_en" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "weight" DECIMAL(65,30) NOT NULL DEFAULT 20.0,
    "employee_rating" INTEGER,
    "employee_comment" TEXT,
    "manager_rating" INTEGER,
    "manager_comment" TEXT,
    "final_score" DECIMAL(65,30),

    CONSTRAINT "goals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "competencies" (
    "id" TEXT NOT NULL,
    "card_id" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "title_ar" TEXT NOT NULL,
    "title_en" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "weight" DECIMAL(65,30) NOT NULL DEFAULT 13.33,
    "employee_rating" INTEGER,
    "employee_comment" TEXT,
    "manager_rating" INTEGER,
    "manager_comment" TEXT,
    "final_score" DECIMAL(65,30),

    CONSTRAINT "competencies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "check_ins" (
    "id" TEXT NOT NULL,
    "card_id" TEXT NOT NULL,
    "quarter" "Quarter" NOT NULL,
    "notes" TEXT NOT NULL,
    "submitted_by" TEXT NOT NULL,
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "check_ins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appraisal_results" (
    "id" TEXT NOT NULL,
    "card_id" TEXT NOT NULL,
    "goals_score" DECIMAL(65,30) NOT NULL,
    "competencies_score" DECIMAL(65,30) NOT NULL,
    "total_score" DECIMAL(65,30) NOT NULL,
    "rating_label" TEXT NOT NULL,
    "hr_notes" TEXT NOT NULL DEFAULT '',
    "finalized_by" TEXT NOT NULL,
    "finalized_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "appraisal_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "competency_templates" (
    "id" TEXT NOT NULL,
    "title_ar" TEXT NOT NULL,
    "title_en" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "competency_templates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "performance_cards_cycle_id_employee_id_key" ON "performance_cards"("cycle_id", "employee_id");

-- CreateIndex
CREATE UNIQUE INDEX "goals_card_id_order_key" ON "goals"("card_id", "order");

-- CreateIndex
CREATE UNIQUE INDEX "competencies_card_id_order_key" ON "competencies"("card_id", "order");

-- CreateIndex
CREATE UNIQUE INDEX "appraisal_results_card_id_key" ON "appraisal_results"("card_id");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_manager_id_fkey" FOREIGN KEY ("manager_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "performance_cycles" ADD CONSTRAINT "performance_cycles_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "performance_cards" ADD CONSTRAINT "performance_cards_cycle_id_fkey" FOREIGN KEY ("cycle_id") REFERENCES "performance_cycles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "performance_cards" ADD CONSTRAINT "performance_cards_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goals" ADD CONSTRAINT "goals_card_id_fkey" FOREIGN KEY ("card_id") REFERENCES "performance_cards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "competencies" ADD CONSTRAINT "competencies_card_id_fkey" FOREIGN KEY ("card_id") REFERENCES "performance_cards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "check_ins" ADD CONSTRAINT "check_ins_card_id_fkey" FOREIGN KEY ("card_id") REFERENCES "performance_cards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "check_ins" ADD CONSTRAINT "check_ins_submitted_by_fkey" FOREIGN KEY ("submitted_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appraisal_results" ADD CONSTRAINT "appraisal_results_card_id_fkey" FOREIGN KEY ("card_id") REFERENCES "performance_cards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appraisal_results" ADD CONSTRAINT "appraisal_results_finalized_by_fkey" FOREIGN KEY ("finalized_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

