import { prisma } from '@/lib/prisma';

export async function createNotification(data: {
  userId: string;
  type: string;
  title: string;
  body: string;
  postId?: string;
  listingId?: string;
}) {
  if (data.userId) {
    await prisma.notification.create({ data });
  }
}
