/*
  Warnings:

  - You are about to drop the column `status` on the `TripDetails` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "TripDetails" DROP COLUMN "status";

-- DropEnum
DROP TYPE "TripStatus";
