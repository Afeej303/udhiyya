ALTER TABLE "users" ADD COLUMN "supabase_identity" TEXT;
CREATE UNIQUE INDEX "users_supabase_identity_key" ON "users"("supabase_identity");
