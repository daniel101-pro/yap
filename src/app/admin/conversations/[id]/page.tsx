import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { prisma } from '@/lib/prisma';

export default async function AdminConversationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const conversation = await prisma.conversation.findUnique({
    where: { id },
    include: {
      listing: { select: { title: true, id: true } },
      buyer: { select: { id: true, anonymousHandle: true } },
      seller: { select: { id: true, anonymousHandle: true } },
      messages: { orderBy: { createdAt: 'asc' }, include: { sender: { select: { id: true, anonymousHandle: true } } } },
    },
  });

  if (!conversation) notFound();

  return (
    <div className="max-w-2xl">
      <Link
        href="/admin/conversations"
        className="flex items-center gap-1 text-[13px] font-medium text-muted hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to conversations
      </Link>

      <div className="mt-4">
        <h1 className="text-[18px] font-bold text-foreground">
          {conversation.listing?.title ?? '(listing deleted)'}
        </h1>
        <p className="mt-1 text-[13px] text-muted">
          Buyer{' '}
          <Link href={`/admin/users/${conversation.buyer.id}`} className="font-medium text-exeter hover:underline">
            {conversation.buyer.anonymousHandle ?? 'Anonymous'}
          </Link>{' '}
          · Seller{' '}
          <Link href={`/admin/users/${conversation.seller.id}`} className="font-medium text-exeter hover:underline">
            {conversation.seller.anonymousHandle ?? 'Anonymous'}
          </Link>
        </p>
      </div>

      <div className="mt-6 space-y-3">
        {conversation.messages.map((m) => {
          const isBuyer = m.senderId === conversation.buyerId;
          return (
            <div key={m.id} className={`flex ${isBuyer ? 'justify-start' : 'justify-end'}`}>
              <div
                className={`max-w-[75%] rounded-2xl px-3.5 py-2.5 ${
                  isBuyer ? 'bg-surface text-foreground' : 'bg-exeter/10 text-foreground'
                }`}
              >
                <p className="text-[11px] font-semibold text-muted">
                  {m.sender.anonymousHandle ?? 'Anonymous'}
                </p>
                <p className="mt-0.5 text-[13px]">{m.content}</p>
                <p className="mt-1 text-[10px] text-muted-light">
                  {m.createdAt.toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          );
        })}
        {conversation.messages.length === 0 && (
          <p className="text-[13px] text-muted">No messages yet.</p>
        )}
      </div>
    </div>
  );
}
