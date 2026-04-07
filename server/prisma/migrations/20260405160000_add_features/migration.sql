-- Add employeeId to User
ALTER TABLE "User" ADD COLUMN "employeeId" TEXT;
CREATE UNIQUE INDEX "User_employeeId_key" ON "User"("employeeId");

-- Add slaHours to Category
ALTER TABLE "Category" ADD COLUMN "slaHours" INTEGER NOT NULL DEFAULT 48;

-- Add deadline, rating, ratingComment to Ticket
ALTER TABLE "Ticket" ADD COLUMN "deadline" TIMESTAMP(3);
ALTER TABLE "Ticket" ADD COLUMN "rating" INTEGER;
ALTER TABLE "Ticket" ADD COLUMN "ratingComment" TEXT;

-- Create Attachment table
CREATE TABLE "Attachment" (
    "id" SERIAL NOT NULL,
    "filename" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "ticketId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Attachment_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Create KnowledgeBase table
CREATE TABLE "KnowledgeBase" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "categoryName" TEXT NOT NULL,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "KnowledgeBase_pkey" PRIMARY KEY ("id")
);
