-- AlterTable
ALTER TABLE "User" ADD COLUMN "deletedAt" DATETIME;

-- CreateTable
CREATE TABLE "DefectImage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "defectId" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "data" BLOB NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DefectImage_defectId_fkey" FOREIGN KEY ("defectId") REFERENCES "Defect" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "DefectImage_defectId_key" ON "DefectImage"("defectId");
