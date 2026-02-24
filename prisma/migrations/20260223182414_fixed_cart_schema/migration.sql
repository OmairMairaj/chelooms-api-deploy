/*
  Warnings:

  - You are about to drop the column `adminId` on the `inventory_audit_logs` table. All the data in the column will be lost.
  - Added the required column `admin_id` to the `inventory_audit_logs` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "OperationalStatus" AS ENUM ('checkout_draft', 'checkout_abandoned', 'pending_payment', 'paid_processing', 'in_production', 'quality_check', 'ready_to_ship', 'shipped', 'delivered', 'cancelled', 'returned');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('unpaid', 'paid', 'failed', 'refunded', 'partially_refunded');

-- CreateEnum
CREATE TYPE "ItemType" AS ENUM ('fabric', 'embellishment', 'design_bundle');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('COD', 'CREDIT_CARD', 'BANK_TRANSFER');

-- AlterTable
ALTER TABLE "inventory_audit_logs" DROP COLUMN "adminId",
ADD COLUMN     "admin_id" UUID NOT NULL;

-- CreateTable
CREATE TABLE "user_addresses" (
    "id" TEXT NOT NULL,
    "user_id" UUID,
    "label" TEXT,
    "fullName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "addressLine1" TEXT NOT NULL,
    "addressLine2" TEXT,
    "city" TEXT NOT NULL,
    "province" TEXT,
    "postalCode" TEXT,
    "country" TEXT NOT NULL DEFAULT 'Pakistan',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_addresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" TEXT NOT NULL,
    "readableId" TEXT,
    "user_id" UUID,
    "shippingAddressData" JSONB,
    "contactDetails" JSONB,
    "isContactVerified" BOOLEAN NOT NULL DEFAULT false,
    "currency" TEXT NOT NULL DEFAULT 'PKR',
    "subtotal" DOUBLE PRECISION NOT NULL DEFAULT 0.00,
    "taxAmount" DOUBLE PRECISION NOT NULL DEFAULT 0.00,
    "shippingCost" DOUBLE PRECISION NOT NULL DEFAULT 0.00,
    "discountAmount" DOUBLE PRECISION NOT NULL DEFAULT 0.00,
    "totalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0.00,
    "operationalStatus" "OperationalStatus" NOT NULL DEFAULT 'checkout_draft',
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'unpaid',
    "paymentMethod" "PaymentMethod",
    "courierName" TEXT,
    "trackingNumber" TEXT,
    "estimatedDelivery" TIMESTAMP(3),
    "placedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "itemType" "ItemType" NOT NULL,
    "inventoryItemId" TEXT,
    "designId" TEXT,
    "nameAtPurchase" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "totalLinePrice" DOUBLE PRECISION NOT NULL,
    "attributes" JSONB,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_timeline" (
    "id" SERIAL NOT NULL,
    "orderId" TEXT NOT NULL,
    "statusFrom" "OperationalStatus",
    "statusTo" "OperationalStatus",
    "description" TEXT NOT NULL,
    "actorName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_timeline_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "orders_readableId_key" ON "orders"("readableId");

-- AddForeignKey
ALTER TABLE "inventory_audit_logs" ADD CONSTRAINT "inventory_audit_logs_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_addresses" ADD CONSTRAINT "user_addresses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "inventory_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_timeline" ADD CONSTRAINT "order_timeline_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
