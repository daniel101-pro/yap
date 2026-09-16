ALTER TABLE "NightlifeTicket" ADD COLUMN "soldAt" TIMESTAMP(3);
ALTER TABLE "NightlifeTicket" ADD COLUMN "payoutReleasedAt" TIMESTAMP(3);
ALTER TABLE "NightlifeTicket" ADD COLUMN "stripePaymentIntentId" TEXT;
ALTER TABLE "NightlifeTicket" ADD COLUMN "saleAmountPence" INTEGER;
