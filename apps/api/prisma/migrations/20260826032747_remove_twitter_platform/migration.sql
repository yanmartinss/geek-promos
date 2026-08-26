-- Postgres não suporta remover valor de enum diretamente: recria o tipo sem TWITTER.
BEGIN;
CREATE TYPE "Platform_new" AS ENUM ('TELEGRAM', 'WHATSAPP');
ALTER TABLE "sent_offers" ALTER COLUMN "platform" TYPE "Platform_new" USING ("platform"::text::"Platform_new");
ALTER TYPE "Platform" RENAME TO "Platform_old";
ALTER TYPE "Platform_new" RENAME TO "Platform";
DROP TYPE "Platform_old";
COMMIT;
