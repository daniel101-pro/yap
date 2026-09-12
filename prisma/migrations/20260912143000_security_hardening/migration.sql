-- AlterTable
ALTER TABLE "NightlifePin" ADD COLUMN "createdById" TEXT,
ADD COLUMN "expiresAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "CommentUpvote" (
    "commentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommentUpvote_pkey" PRIMARY KEY ("commentId","userId")
);

-- CreateIndex
CREATE INDEX "NightlifePin_expiresAt_idx" ON "NightlifePin"("expiresAt");

-- CreateIndex
CREATE INDEX "NightlifePin_createdById_idx" ON "NightlifePin"("createdById");

-- AddForeignKey
ALTER TABLE "NightlifePin" ADD CONSTRAINT "NightlifePin_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommentUpvote" ADD CONSTRAINT "CommentUpvote_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "Comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommentUpvote" ADD CONSTRAINT "CommentUpvote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
