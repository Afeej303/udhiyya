-- CreateEnum
CREATE TYPE "NotificationAudience" AS ENUM ('participants', 'beneficiaries', 'volunteers', 'all');

-- CreateEnum
CREATE TYPE "NotificationEmailState" AS ENUM ('queued', 'sending', 'sent', 'failed', 'skipped');

-- AlterEnum
ALTER TYPE "ProgrammeStatus" ADD VALUE 'closed';

-- AlterTable
ALTER TABLE "programmes" ADD COLUMN     "closed_at" TIMESTAMPTZ(3);

-- CreateTable
CREATE TABLE "programme_announcements" (
    "id" UUID NOT NULL,
    "programme_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "published_at" TIMESTAMPTZ(3),

    CONSTRAINT "programme_announcements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "programme_notifications" (
    "id" UUID NOT NULL,
    "programme_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "read_at" TIMESTAMPTZ(3),

    CONSTRAINT "programme_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_dispatches" (
    "id" UUID NOT NULL,
    "programme_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "audience" "NotificationAudience" NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_dispatches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_email_jobs" (
    "id" UUID NOT NULL,
    "dispatch_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "state" "NotificationEmailState" NOT NULL DEFAULT 'queued',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "ready_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "claim" UUID,

    CONSTRAINT "notification_email_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "programme_enquiries" (
    "id" UUID NOT NULL,
    "programme_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "reply_email" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "programme_enquiries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "programme_announcements_programme_id_id_idx" ON "programme_announcements"("programme_id", "id");

-- CreateIndex
CREATE INDEX "programme_notifications_programme_id_user_id_id_idx" ON "programme_notifications"("programme_id", "user_id", "id");

-- CreateIndex
CREATE INDEX "notification_dispatches_programme_id_id_idx" ON "notification_dispatches"("programme_id", "id");

-- CreateIndex
CREATE INDEX "notification_email_jobs_state_ready_at_idx" ON "notification_email_jobs"("state", "ready_at");

-- CreateIndex
CREATE UNIQUE INDEX "notification_email_jobs_dispatch_id_user_id_key" ON "notification_email_jobs"("dispatch_id", "user_id");

-- CreateIndex
CREATE INDEX "programme_enquiries_programme_id_id_idx" ON "programme_enquiries"("programme_id", "id");

-- AddForeignKey
ALTER TABLE "programme_announcements" ADD CONSTRAINT "programme_announcements_programme_id_fkey" FOREIGN KEY ("programme_id") REFERENCES "programmes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "programme_notifications" ADD CONSTRAINT "programme_notifications_programme_id_fkey" FOREIGN KEY ("programme_id") REFERENCES "programmes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "programme_notifications" ADD CONSTRAINT "programme_notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_dispatches" ADD CONSTRAINT "notification_dispatches_programme_id_fkey" FOREIGN KEY ("programme_id") REFERENCES "programmes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_email_jobs" ADD CONSTRAINT "notification_email_jobs_dispatch_id_fkey" FOREIGN KEY ("dispatch_id") REFERENCES "notification_dispatches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_email_jobs" ADD CONSTRAINT "notification_email_jobs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "programme_enquiries" ADD CONSTRAINT "programme_enquiries_programme_id_fkey" FOREIGN KEY ("programme_id") REFERENCES "programmes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
