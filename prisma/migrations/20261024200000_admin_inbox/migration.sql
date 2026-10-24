-- CreateTable
CREATE TABLE "AdminEmailThread" (
    "id" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "normalizedSubject" TEXT NOT NULL,
    "snippet" TEXT NOT NULL DEFAULT '',
    "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "starred" BOOLEAN NOT NULL DEFAULT false,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "trashed" BOOLEAN NOT NULL DEFAULT false,
    "unreadCount" INTEGER NOT NULL DEFAULT 0,
    "participants" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminEmailThread_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminEmail" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "isDraft" BOOLEAN NOT NULL DEFAULT false,
    "fromName" TEXT,
    "fromEmail" TEXT NOT NULL,
    "toEmails" JSONB NOT NULL,
    "ccEmails" JSONB NOT NULL DEFAULT '[]',
    "bccEmails" JSONB NOT NULL DEFAULT '[]',
    "replyTo" TEXT,
    "subject" TEXT NOT NULL,
    "textBody" TEXT NOT NULL DEFAULT '',
    "htmlBody" TEXT NOT NULL DEFAULT '',
    "snippet" TEXT NOT NULL DEFAULT '',
    "read" BOOLEAN NOT NULL DEFAULT false,
    "starred" BOOLEAN NOT NULL DEFAULT false,
    "trashed" BOOLEAN NOT NULL DEFAULT false,
    "resendEmailId" TEXT,
    "messageId" TEXT,
    "inReplyTo" TEXT,
    "referencesHeader" TEXT,
    "resendStatus" TEXT,
    "sentByEmail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminEmail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminEmailAttachment" (
    "id" TEXT NOT NULL,
    "emailId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "size" INTEGER NOT NULL DEFAULT 0,
    "contentId" TEXT,
    "disposition" TEXT,
    "resendAttachmentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminEmailAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AdminEmailThread_lastMessageAt_idx" ON "AdminEmailThread"("lastMessageAt");

-- CreateIndex
CREATE INDEX "AdminEmailThread_normalizedSubject_idx" ON "AdminEmailThread"("normalizedSubject");

-- CreateIndex
CREATE INDEX "AdminEmailThread_trashed_archived_lastMessageAt_idx" ON "AdminEmailThread"("trashed", "archived", "lastMessageAt");

-- CreateIndex
CREATE UNIQUE INDEX "AdminEmail_resendEmailId_key" ON "AdminEmail"("resendEmailId");

-- CreateIndex
CREATE INDEX "AdminEmail_threadId_idx" ON "AdminEmail"("threadId");

-- CreateIndex
CREATE INDEX "AdminEmail_messageId_idx" ON "AdminEmail"("messageId");

-- CreateIndex
CREATE INDEX "AdminEmail_fromEmail_idx" ON "AdminEmail"("fromEmail");

-- CreateIndex
CREATE INDEX "AdminEmail_isDraft_createdAt_idx" ON "AdminEmail"("isDraft", "createdAt");

-- CreateIndex
CREATE INDEX "AdminEmailAttachment_emailId_idx" ON "AdminEmailAttachment"("emailId");

-- AddForeignKey
ALTER TABLE "AdminEmail" ADD CONSTRAINT "AdminEmail_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "AdminEmailThread"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminEmailAttachment" ADD CONSTRAINT "AdminEmailAttachment_emailId_fkey" FOREIGN KEY ("emailId") REFERENCES "AdminEmail"("id") ON DELETE CASCADE ON UPDATE CASCADE;
