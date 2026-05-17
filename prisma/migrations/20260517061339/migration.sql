/*
  Warnings:

  - A unique constraint covering the columns `[qrCodeHash]` on the table `vehicles` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "service_documents" ADD COLUMN     "data" BYTEA,
ADD COLUMN     "mimeType" TEXT;

-- AlterTable
ALTER TABLE "service_item_photos" ADD COLUMN     "data" BYTEA,
ADD COLUMN     "mimeType" TEXT;

-- AlterTable
ALTER TABLE "vehicle_documents" ADD COLUMN     "data" BYTEA,
ADD COLUMN     "mimeType" TEXT;

-- AlterTable
ALTER TABLE "vehicles" ADD COLUMN     "qrCodeHash" TEXT;

-- AlterTable
ALTER TABLE "workshop_documents" ADD COLUMN     "data" BYTEA,
ADD COLUMN     "mimeType" TEXT;

-- CreateTable
CREATE TABLE "blob_files" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "data" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "blob_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "signatures" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "imageData" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "signatures_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "blob_files_key_key" ON "blob_files"("key");

-- CreateIndex
CREATE UNIQUE INDEX "vehicles_qrCodeHash_key" ON "vehicles"("qrCodeHash");

-- AddForeignKey
ALTER TABLE "signatures" ADD CONSTRAINT "signatures_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
