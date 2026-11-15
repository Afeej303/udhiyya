-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('pending', 'verified', 'rejected');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('cash', 'upi', 'bank_transfer', 'other');

-- CreateEnum
CREATE TYPE "ReceiptKind" AS ENUM ('registration', 'payment');

-- CreateTable
CREATE TABLE "payments" (
    "id" UUID NOT NULL,
    "programme_id" UUID NOT NULL,
    "registration_id" UUID NOT NULL,
    "request_key" TEXT NOT NULL,
    "amount_minor" INTEGER NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "reference" TEXT,
    "received_at" TIMESTAMPTZ(3) NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'pending',
    "decided_at" TIMESTAMPTZ(3),
    "decision_reason" TEXT,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "receipts" (
    "id" UUID NOT NULL,
    "programme_id" UUID NOT NULL,
    "registration_id" UUID NOT NULL,
    "payment_id" UUID,
    "kind" "ReceiptKind" NOT NULL,
    "amount_minor" INTEGER,
    "issued_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "receipts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expense_categories" (
    "id" UUID NOT NULL,
    "programme_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "name_key" TEXT NOT NULL,

    CONSTRAINT "expense_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expenses" (
    "id" UUID NOT NULL,
    "programme_id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "amount_minor" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "incurred_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "payments_programme_id_id_idx" ON "payments"("programme_id", "id");

-- CreateIndex
CREATE INDEX "payments_programme_id_registration_id_status_idx" ON "payments"("programme_id", "registration_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "payments_programme_id_request_key_key" ON "payments"("programme_id", "request_key");

-- CreateIndex
CREATE UNIQUE INDEX "payments_programme_id_registration_id_id_key" ON "payments"("programme_id", "registration_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "receipts_payment_id_key" ON "receipts"("payment_id");

-- CreateIndex
CREATE INDEX "receipts_programme_id_registration_id_id_idx" ON "receipts"("programme_id", "registration_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "receipts_programme_id_registration_id_payment_id_key" ON "receipts"("programme_id", "registration_id", "payment_id");

-- CreateIndex
CREATE UNIQUE INDEX "expense_categories_programme_id_id_key" ON "expense_categories"("programme_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "expense_categories_programme_id_name_key_key" ON "expense_categories"("programme_id", "name_key");

-- CreateIndex
CREATE INDEX "expenses_programme_id_id_idx" ON "expenses"("programme_id", "id");

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_programme_id_registration_id_fkey" FOREIGN KEY ("programme_id", "registration_id") REFERENCES "registrations"("programme_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_programme_id_registration_id_fkey" FOREIGN KEY ("programme_id", "registration_id") REFERENCES "registrations"("programme_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_programme_id_registration_id_payment_id_fkey" FOREIGN KEY ("programme_id", "registration_id", "payment_id") REFERENCES "payments"("programme_id", "registration_id", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "expense_categories" ADD CONSTRAINT "expense_categories_programme_id_fkey" FOREIGN KEY ("programme_id") REFERENCES "programmes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_programme_id_category_id_fkey" FOREIGN KEY ("programme_id", "category_id") REFERENCES "expense_categories"("programme_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "payments"
    ADD CONSTRAINT "payments_amount_check" CHECK ("amount_minor" > 0);
ALTER TABLE "expenses"
    ADD CONSTRAINT "expenses_amount_check" CHECK ("amount_minor" > 0);
ALTER TABLE "receipts"
    ADD CONSTRAINT "receipts_kind_check" CHECK (
        ("kind" = 'registration' AND "payment_id" IS NULL AND "amount_minor" IS NULL)
        OR ("kind" = 'payment' AND "payment_id" IS NOT NULL AND "amount_minor" IS NOT NULL AND "amount_minor" > 0)
    );

CREATE UNIQUE INDEX "receipts_registration_confirmation_key"
    ON "receipts"("registration_id") WHERE "kind" = 'registration';

INSERT INTO "receipts" ("id", "programme_id", "registration_id", "kind", "issued_at")
SELECT gen_random_uuid(), "programme_id", "id", 'registration', COALESCE("decided_at", "submitted_at")
FROM "registrations" WHERE "status" = 'approved';
