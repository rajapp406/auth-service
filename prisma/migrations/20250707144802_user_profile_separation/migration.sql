/*
  Warnings:

  - You are about to drop the column `age` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `fitnessLevel` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `gender` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `goals` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `preferredWorkouts` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `workoutFrequency` on the `users` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "users" DROP COLUMN "age",
DROP COLUMN "fitnessLevel",
DROP COLUMN "gender",
DROP COLUMN "goals",
DROP COLUMN "preferredWorkouts",
DROP COLUMN "workoutFrequency";

-- CreateTable
CREATE TABLE "UserProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "age" INTEGER,
    "gender" TEXT,
    "fitnessLevel" TEXT,
    "goals" TEXT[],
    "workoutFrequency" TEXT,
    "preferredWorkouts" TEXT[],

    CONSTRAINT "UserProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserProfile_userId_key" ON "UserProfile"("userId");

-- AddForeignKey
ALTER TABLE "UserProfile" ADD CONSTRAINT "UserProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
