-- CreateEnum
CREATE TYPE "Department" AS ENUM ('slaughter', 'processing', 'distribution', 'finance');

-- CreateEnum
CREATE TYPE "WorkState" AS ENUM ('pending', 'in_progress', 'completed');

-- CreateEnum
CREATE TYPE "ProcessingStage" AS ENUM ('cutting', 'weighing', 'packaging');

-- CreateEnum
CREATE TYPE "IssueState" AS ENUM ('open', 'resolved');

-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "cash_assignment_id" UUID,
ADD COLUMN     "cash_submitted_by_id" UUID;

-- CreateTable
CREATE TABLE "volunteers" (
    "id" UUID NOT NULL,
    "programme_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "user_id" UUID,
    "departments" "Department"[],
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "volunteers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "programme_schedules" (
    "id" UUID NOT NULL,
    "programme_id" UUID NOT NULL,
    "department" "Department" NOT NULL,
    "animal_id" UUID,
    "starts_at" TIMESTAMPTZ(3) NOT NULL,
    "ends_at" TIMESTAMPTZ(3) NOT NULL,
    "location" TEXT NOT NULL,
    "status" "WorkState" NOT NULL DEFAULT 'pending',
    "stage" "ProcessingStage",
    "measured_grams" INTEGER,
    "package_count" INTEGER,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "programme_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "schedule_members" (
    "programme_id" UUID NOT NULL,
    "schedule_id" UUID NOT NULL,
    "volunteer_id" UUID NOT NULL,

    CONSTRAINT "schedule_members_pkey" PRIMARY KEY ("programme_id","schedule_id","volunteer_id")
);

-- CreateTable
CREATE TABLE "volunteer_tasks" (
    "id" UUID NOT NULL,
    "programme_id" UUID NOT NULL,
    "department" "Department" NOT NULL,
    "assignee_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "schedule_id" UUID,
    "resource_id" UUID,
    "status" "WorkState" NOT NULL DEFAULT 'pending',
    "note" TEXT,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "volunteer_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "operation_issues" (
    "id" UUID NOT NULL,
    "programme_id" UUID NOT NULL,
    "reporter_id" UUID NOT NULL,
    "department" "Department",
    "task_id" UUID,
    "operation_id" UUID,
    "description" TEXT NOT NULL,
    "status" "IssueState" NOT NULL DEFAULT 'open',
    "resolution" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "operation_issues_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "volunteers_programme_id_id_key" ON "volunteers"("programme_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "volunteers_programme_id_email_key" ON "volunteers"("programme_id", "email");

-- CreateIndex
CREATE UNIQUE INDEX "volunteers_programme_id_user_id_key" ON "volunteers"("programme_id", "user_id");

-- CreateIndex
CREATE INDEX "programme_schedules_programme_id_department_status_idx" ON "programme_schedules"("programme_id", "department", "status");

-- CreateIndex
CREATE UNIQUE INDEX "programme_schedules_programme_id_id_key" ON "programme_schedules"("programme_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "programme_schedules_programme_id_animal_id_department_key" ON "programme_schedules"("programme_id", "animal_id", "department");

-- CreateIndex
CREATE INDEX "schedule_members_programme_id_volunteer_id_idx" ON "schedule_members"("programme_id", "volunteer_id");

-- CreateIndex
CREATE INDEX "volunteer_tasks_programme_id_assignee_id_department_idx" ON "volunteer_tasks"("programme_id", "assignee_id", "department");

-- CreateIndex
CREATE UNIQUE INDEX "volunteer_tasks_programme_id_id_key" ON "volunteer_tasks"("programme_id", "id");

-- CreateIndex
CREATE INDEX "operation_issues_programme_id_id_idx" ON "operation_issues"("programme_id", "id");

-- CreateIndex
CREATE INDEX "operation_issues_programme_id_reporter_id_idx" ON "operation_issues"("programme_id", "reporter_id");

-- CreateIndex
CREATE INDEX "payments_cash_assignment_id_idx" ON "payments"("cash_assignment_id");

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_programme_id_cash_assignment_id_fkey" FOREIGN KEY ("programme_id", "cash_assignment_id") REFERENCES "volunteer_tasks"("programme_id", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "volunteers" ADD CONSTRAINT "volunteers_programme_id_fkey" FOREIGN KEY ("programme_id") REFERENCES "programmes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "volunteers" ADD CONSTRAINT "volunteers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "programme_schedules" ADD CONSTRAINT "programme_schedules_programme_id_fkey" FOREIGN KEY ("programme_id") REFERENCES "programmes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "programme_schedules" ADD CONSTRAINT "programme_schedules_programme_id_animal_id_fkey" FOREIGN KEY ("programme_id", "animal_id") REFERENCES "animals"("programme_id", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "schedule_members" ADD CONSTRAINT "schedule_members_programme_id_schedule_id_fkey" FOREIGN KEY ("programme_id", "schedule_id") REFERENCES "programme_schedules"("programme_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedule_members" ADD CONSTRAINT "schedule_members_programme_id_volunteer_id_fkey" FOREIGN KEY ("programme_id", "volunteer_id") REFERENCES "volunteers"("programme_id", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "volunteer_tasks" ADD CONSTRAINT "volunteer_tasks_programme_id_assignee_id_fkey" FOREIGN KEY ("programme_id", "assignee_id") REFERENCES "volunteers"("programme_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "volunteer_tasks" ADD CONSTRAINT "volunteer_tasks_programme_id_schedule_id_fkey" FOREIGN KEY ("programme_id", "schedule_id") REFERENCES "programme_schedules"("programme_id", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "operation_issues" ADD CONSTRAINT "operation_issues_programme_id_reporter_id_fkey" FOREIGN KEY ("programme_id", "reporter_id") REFERENCES "volunteers"("programme_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operation_issues" ADD CONSTRAINT "operation_issues_programme_id_task_id_fkey" FOREIGN KEY ("programme_id", "task_id") REFERENCES "volunteer_tasks"("programme_id", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "operation_issues" ADD CONSTRAINT "operation_issues_programme_id_operation_id_fkey" FOREIGN KEY ("programme_id", "operation_id") REFERENCES "programme_schedules"("programme_id", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE "programme_schedules"
    ADD CONSTRAINT "programme_schedules_time_check" CHECK ("ends_at" > "starts_at"),
    ADD CONSTRAINT "programme_schedules_measurements_check" CHECK ("measured_grams" >= 0 AND "package_count" >= 0);
ALTER TABLE "payments"
    ADD CONSTRAINT "payments_cash_assignment_check" CHECK (
        ("cash_assignment_id" IS NULL AND "cash_submitted_by_id" IS NULL)
        OR ("method" = 'cash' AND "cash_assignment_id" IS NOT NULL AND "cash_submitted_by_id" IS NOT NULL)
    );
