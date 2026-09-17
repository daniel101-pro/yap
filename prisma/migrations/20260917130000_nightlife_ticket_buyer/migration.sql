-- AlterTable
ALTER TABLE "NightlifeTicket" ADD COLUMN "buyerId" TEXT;

-- CreateIndex
CREATE INDEX "NightlifeTicket_buyerId_idx" ON "NightlifeTicket"("buyerId");

-- AddForeignKey
ALTER TABLE "NightlifeTicket" ADD CONSTRAINT "NightlifeTicket_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
