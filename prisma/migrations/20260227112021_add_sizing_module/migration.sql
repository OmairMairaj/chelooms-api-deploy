-- CreateEnum
CREATE TYPE "MeasurementUnit" AS ENUM ('Inches', 'CM');

-- CreateEnum
CREATE TYPE "SizingMethod" AS ENUM ('Standard_Preset', 'Jute_Fit_Custom');

-- CreateTable
CREATE TABLE "standard_sizes" (
    "size_id" SERIAL NOT NULL,
    "sizeCode" VARCHAR(10) NOT NULL,
    "label" VARCHAR(50) NOT NULL,
    "recommendations" JSONB DEFAULT '{}',
    "measurements" JSONB NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "standard_sizes_pkey" PRIMARY KEY ("size_id")
);

-- CreateTable
CREATE TABLE "user_sizing_profiles" (
    "profile_id" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "profileNickname" VARCHAR(50) NOT NULL,
    "method" "SizingMethod" NOT NULL,
    "standardSizeId" INTEGER,
    "customMeasurements" JSONB,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_sizing_profiles_pkey" PRIMARY KEY ("profile_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "standard_sizes_sizeCode_key" ON "standard_sizes"("sizeCode");

-- AddForeignKey
ALTER TABLE "user_sizing_profiles" ADD CONSTRAINT "user_sizing_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_sizing_profiles" ADD CONSTRAINT "user_sizing_profiles_standardSizeId_fkey" FOREIGN KEY ("standardSizeId") REFERENCES "standard_sizes"("size_id") ON DELETE SET NULL ON UPDATE CASCADE;
