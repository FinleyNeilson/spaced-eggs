-- DropIndex
DROP INDEX "Pet_userId_key";

-- AlterTable
ALTER TABLE "Pet" ADD COLUMN "retiredAt" DATETIME;

-- CreateIndex
CREATE INDEX "Pet_userId_idx" ON "Pet"("userId");
