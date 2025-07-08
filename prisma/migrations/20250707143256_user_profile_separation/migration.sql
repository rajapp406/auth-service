-- AlterTable
ALTER TABLE "users" ADD COLUMN     "age" INTEGER,
ADD COLUMN     "fitnessLevel" TEXT,
ADD COLUMN     "gender" TEXT,
ADD COLUMN     "goals" TEXT[],
ADD COLUMN     "preferredWorkouts" TEXT[],
ADD COLUMN     "workoutFrequency" TEXT;
