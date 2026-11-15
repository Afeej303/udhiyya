CREATE TYPE "ProgrammeStatus" AS ENUM ('draft', 'published');

CREATE TABLE "programmes" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "year" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "status" "ProgrammeStatus" NOT NULL DEFAULT 'draft',
    "description" TEXT,
    "guidelines" TEXT,
    "public_email" TEXT,
    "registration_opens_at" TIMESTAMPTZ(3),
    "registration_closes_at" TIMESTAMPTZ(3),
    "registration_limit" INTEGER CHECK ("registration_limit" > 0),
    "price_minor" INTEGER CHECK ("price_minor" >= 0),

    CONSTRAINT "programmes_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "programmes_dates_check" CHECK ("registration_closes_at" > "registration_opens_at"),
    CONSTRAINT "programmes_organization_id_fkey" FOREIGN KEY ("organization_id")
        REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "programmes_organization_id_year_key" ON "programmes"("organization_id", "year");
CREATE INDEX "programmes_organization_id_id_idx" ON "programmes"("organization_id", "id");
