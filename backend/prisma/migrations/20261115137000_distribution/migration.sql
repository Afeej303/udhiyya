-- CreateEnum
CREATE TYPE "EligibilityStatus" AS ENUM ('pending', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "DistributionRecipient" AS ENUM ('participant', 'beneficiary');

-- CreateEnum
CREATE TYPE "DistributionStatus" AS ENUM ('draft', 'confirmed', 'packed', 'collected', 'delivered', 'cancelled');

-- DropIndex
DROP INDEX "households_organization_id_id_idx";

-- CreateTable
CREATE TABLE "beneficiaries" (
    "id" UUID NOT NULL,
    "programme_id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "household_id" UUID NOT NULL,
    "user_id" UUID,
    "eligibility" "EligibilityStatus" NOT NULL DEFAULT 'pending',
    "reason" TEXT,
    "access_email" TEXT,
    "access_token_hash" TEXT,
    "access_expires_at" TIMESTAMPTZ(3),

    CONSTRAINT "beneficiaries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "distribution_policies" (
    "programme_id" UUID NOT NULL,
    "participants_enabled" BOOLEAN NOT NULL,
    "grams_per_share" INTEGER NOT NULL,
    "beneficiaries_enabled" BOOLEAN NOT NULL,
    "grams_per_household" INTEGER NOT NULL,
    "public_guidance" TEXT NOT NULL,

    CONSTRAINT "distribution_policies_pkey" PRIMARY KEY ("programme_id")
);

-- CreateTable
CREATE TABLE "collection_windows" (
    "id" UUID NOT NULL,
    "programme_id" UUID NOT NULL,
    "location" TEXT NOT NULL,
    "starts_at" TIMESTAMPTZ(3) NOT NULL,
    "ends_at" TIMESTAMPTZ(3) NOT NULL,
    "instructions" TEXT NOT NULL,

    CONSTRAINT "collection_windows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "distribution_allocations" (
    "id" UUID NOT NULL,
    "programme_id" UUID NOT NULL,
    "recipient_type" "DistributionRecipient" NOT NULL,
    "registration_id" UUID,
    "beneficiary_id" UUID,
    "quantity_grams" INTEGER NOT NULL,
    "collection_window_id" UUID NOT NULL,
    "status" "DistributionStatus" NOT NULL DEFAULT 'draft',
    "collection_reference" UUID,
    "packed_at" TIMESTAMPTZ(3),
    "handed_off_at" TIMESTAMPTZ(3),

    CONSTRAINT "distribution_allocations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "beneficiaries_access_token_hash_key" ON "beneficiaries"("access_token_hash");

-- CreateIndex
CREATE UNIQUE INDEX "beneficiaries_programme_id_id_key" ON "beneficiaries"("programme_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "beneficiaries_programme_id_user_id_key" ON "beneficiaries"("programme_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "beneficiaries_programme_id_household_id_key" ON "beneficiaries"("programme_id", "household_id");

-- CreateIndex
CREATE UNIQUE INDEX "collection_windows_programme_id_id_key" ON "collection_windows"("programme_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "distribution_allocations_collection_reference_key" ON "distribution_allocations"("collection_reference");

-- CreateIndex
CREATE INDEX "distribution_allocations_programme_id_id_idx" ON "distribution_allocations"("programme_id", "id");

-- CreateIndex
CREATE INDEX "distribution_allocations_programme_id_status_idx" ON "distribution_allocations"("programme_id", "status");

-- CreateIndex
CREATE INDEX "distribution_allocations_programme_id_collection_window_id_idx" ON "distribution_allocations"("programme_id", "collection_window_id");

-- CreateIndex
CREATE INDEX "distribution_allocations_programme_id_registration_id_idx" ON "distribution_allocations"("programme_id", "registration_id");

-- CreateIndex
CREATE INDEX "distribution_allocations_programme_id_beneficiary_id_idx" ON "distribution_allocations"("programme_id", "beneficiary_id");

-- CreateIndex
CREATE UNIQUE INDEX "programmes_id_organization_id_key" ON "programmes"("id", "organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "households_organization_id_id_key" ON "households"("organization_id", "id");

-- AddForeignKey
ALTER TABLE "beneficiaries" ADD CONSTRAINT "beneficiaries_programme_id_organization_id_fkey" FOREIGN KEY ("programme_id", "organization_id") REFERENCES "programmes"("id", "organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "beneficiaries" ADD CONSTRAINT "beneficiaries_organization_id_household_id_fkey" FOREIGN KEY ("organization_id", "household_id") REFERENCES "households"("organization_id", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "beneficiaries" ADD CONSTRAINT "beneficiaries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "distribution_policies" ADD CONSTRAINT "distribution_policies_programme_id_fkey" FOREIGN KEY ("programme_id") REFERENCES "programmes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collection_windows" ADD CONSTRAINT "collection_windows_programme_id_fkey" FOREIGN KEY ("programme_id") REFERENCES "programmes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "distribution_allocations" ADD CONSTRAINT "distribution_allocations_programme_id_registration_id_fkey" FOREIGN KEY ("programme_id", "registration_id") REFERENCES "registrations"("programme_id", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "distribution_allocations" ADD CONSTRAINT "distribution_allocations_programme_id_beneficiary_id_fkey" FOREIGN KEY ("programme_id", "beneficiary_id") REFERENCES "beneficiaries"("programme_id", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "distribution_allocations" ADD CONSTRAINT "distribution_allocations_programme_id_collection_window_id_fkey" FOREIGN KEY ("programme_id", "collection_window_id") REFERENCES "collection_windows"("programme_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "collection_windows"
    ADD CONSTRAINT "collection_windows_time_check" CHECK ("ends_at" > "starts_at");
ALTER TABLE "distribution_policies"
    ADD CONSTRAINT "distribution_policies_rations_check" CHECK (
        "grams_per_share" >= 0 AND "grams_per_household" >= 0
        AND (NOT "participants_enabled" OR "grams_per_share" > 0)
        AND (NOT "beneficiaries_enabled" OR "grams_per_household" > 0)
    );
ALTER TABLE "distribution_allocations"
    ADD CONSTRAINT "distribution_allocations_quantity_check" CHECK ("quantity_grams" > 0),
    ADD CONSTRAINT "distribution_allocations_recipient_check" CHECK (
        ("recipient_type" = 'participant' AND "registration_id" IS NOT NULL AND "beneficiary_id" IS NULL)
        OR ("recipient_type" = 'beneficiary' AND "beneficiary_id" IS NOT NULL AND "registration_id" IS NULL)
    );

CREATE UNIQUE INDEX "active_distribution_registration_key"
    ON "distribution_allocations"("programme_id", "registration_id")
    WHERE "registration_id" IS NOT NULL AND "status" <> 'cancelled';
CREATE UNIQUE INDEX "active_distribution_beneficiary_key"
    ON "distribution_allocations"("programme_id", "beneficiary_id")
    WHERE "beneficiary_id" IS NOT NULL AND "status" <> 'cancelled';
