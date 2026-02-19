/*
  Warnings:

  - You are about to drop the column `imageUrl` on the `inventory_items` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "inventory_items" DROP COLUMN "imageUrl",
ADD COLUMN     "images" JSONB DEFAULT '{}';
