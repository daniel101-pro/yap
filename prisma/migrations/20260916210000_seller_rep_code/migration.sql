ALTER TABLE "User" ADD COLUMN "repCode" TEXT;

CREATE UNIQUE INDEX "User_repCode_key" ON "User"("repCode");

CREATE TABLE "RepCodeUse" (
    "id" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "usedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ticketId" TEXT,

    CONSTRAINT "RepCodeUse_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "RepCodeUse_sellerId_idx" ON "RepCodeUse"("sellerId");

ALTER TABLE "RepCodeUse" ADD CONSTRAINT "RepCodeUse_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
