-- CreateTable
CREATE TABLE "animals" (
    "id" UUID NOT NULL,
    "programme_id" UUID NOT NULL,
    "reference" TEXT NOT NULL,
    "share_capacity" INTEGER NOT NULL,
    "supplier_name" TEXT,
    "procurement_cost_minor" INTEGER,
    "procured_at" TIMESTAMPTZ(3),

    CONSTRAINT "animals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "animal_groups" (
    "id" UUID NOT NULL,
    "programme_id" UUID NOT NULL,
    "animal_id" UUID NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "animal_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "share_allocations" (
    "id" UUID NOT NULL,
    "programme_id" UUID NOT NULL,
    "animal_id" UUID NOT NULL,
    "group_id" UUID NOT NULL,
    "registration_id" UUID NOT NULL,
    "shares" INTEGER NOT NULL,

    CONSTRAINT "share_allocations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "animals_programme_id_id_key" ON "animals"("programme_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "animals_programme_id_reference_key" ON "animals"("programme_id", "reference");

-- CreateIndex
CREATE INDEX "animal_groups_programme_id_id_idx" ON "animal_groups"("programme_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "animal_groups_programme_id_id_animal_id_key" ON "animal_groups"("programme_id", "id", "animal_id");

-- CreateIndex
CREATE UNIQUE INDEX "share_allocations_registration_id_key" ON "share_allocations"("registration_id");

-- CreateIndex
CREATE INDEX "share_allocations_programme_id_id_idx" ON "share_allocations"("programme_id", "id");

-- CreateIndex
CREATE INDEX "share_allocations_programme_id_animal_id_idx" ON "share_allocations"("programme_id", "animal_id");

-- CreateIndex
CREATE INDEX "share_allocations_programme_id_group_id_idx" ON "share_allocations"("programme_id", "group_id");

-- CreateIndex
CREATE UNIQUE INDEX "share_allocations_programme_id_registration_id_key" ON "share_allocations"("programme_id", "registration_id");

-- CreateIndex
CREATE UNIQUE INDEX "registrations_programme_id_id_key" ON "registrations"("programme_id", "id");

-- AddForeignKey
ALTER TABLE "animals" ADD CONSTRAINT "animals_programme_id_fkey" FOREIGN KEY ("programme_id") REFERENCES "programmes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "animal_groups" ADD CONSTRAINT "animal_groups_programme_id_animal_id_fkey" FOREIGN KEY ("programme_id", "animal_id") REFERENCES "animals"("programme_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "share_allocations" ADD CONSTRAINT "share_allocations_programme_id_group_id_animal_id_fkey" FOREIGN KEY ("programme_id", "group_id", "animal_id") REFERENCES "animal_groups"("programme_id", "id", "animal_id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "share_allocations" ADD CONSTRAINT "share_allocations_programme_id_registration_id_fkey" FOREIGN KEY ("programme_id", "registration_id") REFERENCES "registrations"("programme_id", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE "animals"
    ADD CONSTRAINT "animals_capacity_check" CHECK ("share_capacity" > 0),
    ADD CONSTRAINT "animals_procurement_cost_check" CHECK ("procurement_cost_minor" >= 0);
ALTER TABLE "share_allocations"
    ADD CONSTRAINT "share_allocations_shares_check" CHECK ("shares" > 0);
