-- CreateEnum
CREATE TYPE "RegistrationStatus" AS ENUM ('submitted', 'approved', 'rejected', 'cancelled');

-- CreateTable
CREATE TABLE "participation_options" (
    "id" UUID NOT NULL,
    "programme_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "price_minor" INTEGER NOT NULL,
    "max_shares" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "participation_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "applicant_households" (
    "id" UUID NOT NULL,
    "programme_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "contact_email" TEXT,
    "contact_phone" TEXT,

    CONSTRAINT "applicant_households_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "registrations" (
    "id" UUID NOT NULL,
    "programme_id" UUID NOT NULL,
    "applicant_id" UUID NOT NULL,
    "household_id" UUID NOT NULL,
    "household_snapshot" JSONB NOT NULL,
    "option_id" UUID NOT NULL,
    "option_name" TEXT NOT NULL,
    "unit_price_minor" INTEGER NOT NULL,
    "fee_minor" INTEGER NOT NULL,
    "shares" INTEGER NOT NULL,
    "status" "RegistrationStatus" NOT NULL DEFAULT 'submitted',
    "submitted_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decided_at" TIMESTAMPTZ(3),
    "decision_reason" TEXT,

    CONSTRAINT "registrations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "participation_options_programme_id_id_key" ON "participation_options"("programme_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "applicant_households_programme_id_user_id_key" ON "applicant_households"("programme_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "applicant_households_id_programme_id_user_id_key" ON "applicant_households"("id", "programme_id", "user_id");

-- CreateIndex
CREATE INDEX "registrations_programme_id_id_idx" ON "registrations"("programme_id", "id");

-- CreateIndex
CREATE INDEX "registrations_programme_id_status_idx" ON "registrations"("programme_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "registrations_programme_id_applicant_id_key" ON "registrations"("programme_id", "applicant_id");

-- AddForeignKey
ALTER TABLE "participation_options" ADD CONSTRAINT "participation_options_programme_id_fkey" FOREIGN KEY ("programme_id") REFERENCES "programmes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applicant_households" ADD CONSTRAINT "applicant_households_programme_id_fkey" FOREIGN KEY ("programme_id") REFERENCES "programmes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applicant_households" ADD CONSTRAINT "applicant_households_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registrations" ADD CONSTRAINT "registrations_programme_id_fkey" FOREIGN KEY ("programme_id") REFERENCES "programmes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registrations" ADD CONSTRAINT "registrations_applicant_id_fkey" FOREIGN KEY ("applicant_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registrations" ADD CONSTRAINT "registrations_household_id_programme_id_applicant_id_fkey" FOREIGN KEY ("household_id", "programme_id", "applicant_id") REFERENCES "applicant_households"("id", "programme_id", "user_id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "registrations" ADD CONSTRAINT "registrations_programme_id_option_id_fkey" FOREIGN KEY ("programme_id", "option_id") REFERENCES "participation_options"("programme_id", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE "participation_options"
    ADD CONSTRAINT "participation_options_price_check" CHECK ("price_minor" >= 0),
    ADD CONSTRAINT "participation_options_shares_check" CHECK ("max_shares" > 0);
ALTER TABLE "registrations"
    ADD CONSTRAINT "registrations_fee_check" CHECK ("unit_price_minor" >= 0 AND "fee_minor" = "unit_price_minor"::bigint * "shares"),
    ADD CONSTRAINT "registrations_shares_check" CHECK ("shares" > 0);
