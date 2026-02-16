/*
  Warnings:

  - You are about to drop the column `code_hash` on the `verification_codes` table. All the data in the column will be lost.
  - Added the required column `code` to the `verification_codes` table without a default value. This is not possible if the table is not empty.
  - Added the required column `user_id` to the `verification_codes` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "verification_codes" DROP COLUMN "code_hash",
ADD COLUMN     "code" VARCHAR(10) NOT NULL,
ADD COLUMN     "user_id" UUID NOT NULL;

-- AddForeignKey
ALTER TABLE "verification_codes" ADD CONSTRAINT "verification_codes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;
