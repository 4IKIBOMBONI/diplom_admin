-- AlterEnum: добавляем источник заявок MAX
ALTER TYPE "TicketSource" ADD VALUE IF NOT EXISTS 'MAX';

-- AlterTable: добавляем поля для идентификации пользователя MAX
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "maxId" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "maxUsername" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "User_maxId_key" ON "User"("maxId");
