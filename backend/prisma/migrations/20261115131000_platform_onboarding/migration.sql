ALTER TYPE "OrganizationStatus" ADD VALUE 'ONBOARDING';
ALTER TYPE "OrganizationStatus" ADD VALUE 'CLOSED';

ALTER TABLE "organizations"
    ADD COLUMN "locality" TEXT,
    ADD COLUMN "contact_email" TEXT;

ALTER TABLE "organization_invitations" ADD COLUMN "recipient_name" TEXT;
