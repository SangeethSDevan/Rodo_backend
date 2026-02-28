-- CreateTable
CREATE TABLE "RoadQuality" (
    "geohash" TEXT NOT NULL,
    "roadQuality" DOUBLE PRECISION NOT NULL DEFAULT 1.0,

    CONSTRAINT "RoadQuality_pkey" PRIMARY KEY ("geohash")
);
