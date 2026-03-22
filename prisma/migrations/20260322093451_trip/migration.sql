/*
  Warnings:

  - Added the required column `updatedAt` to the `RoadQuality` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "TripStatus" AS ENUM ('NOT_STARTED', 'DRIVING', 'COMPLETED');

-- AlterTable
ALTER TABLE "RoadQuality" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- CreateTable
CREATE TABLE "TripDetails" (
    "trip_id" TEXT NOT NULL,
    "distance_covered" TEXT NOT NULL,
    "status" "TripStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "user_id" TEXT NOT NULL,

    CONSTRAINT "TripDetails_pkey" PRIMARY KEY ("trip_id")
);

-- AddForeignKey
ALTER TABLE "TripDetails" ADD CONSTRAINT "TripDetails_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "Users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;
