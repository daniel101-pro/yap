import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import Pagination from '@/components/admin/Pagination';

const PAGE_SIZE = 30;

export default async function AdminConversationsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageStr } = await searchParams;
  const page = Math.max(1, Number(pageStr) || 1);

  const [conversations, total] = await Promise.all([
    prisma.conversation.findMany({
      orderBy: { lastMessageAt: 'desc' },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        listing: { select: { title: true } },
        buyer: { select: { id: true, anonymousHandle: true } },
        seller: { select: { id: true, anonymousHandle: true } },
        _count: { select: { messages: true } },
      },
    }),
    prisma.conversation.count(),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div>
      <div>
        <h1 className="text-[20px] font-bold text-foreground">Conversations</h1>
        <p className="mt-1 text-[13px] text-muted">{total} total — marketplace buyer/seller DMs.</p>
      </div>

      <div className="mt-5 overflow-hidden rounded-2xl ring-1 ring-divider">
        <table className="w-full text-left text-[13px]">
          <thead className="bg-surface/70 text-[11px] uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-2.5 font-semibold">Listing</th>
              <th className="px-4 py-2.5 font-semibold">Buyer</th>
              <th className="px-4 py-2.5 font-semibold">Seller</th>
              <th className="px-4 py-2.5 font-semibold">Messages</th>
              <th className="px-4 py-2.5 font-semibold">Last activity</th>
              <th className="px-4 py-2.5 font-semibold" />
            </tr>
          </thead>
          <tbody>
            {conversations.map((c, i) => (
              <tr
                key={c.id}
                className="row-in border-t border-divider/60"
                style={{ animationDelay: `${Math.min(i * 0.025, 0.3)}s` }}
              >
                <td className="max-w-[220px] px-4 py-2.5">
                  <p className="line-clamp-1 text-foreground">{c.listing?.title ?? '(listing deleted)'}</p>
                </td>
                <td className="px-4 py-2.5">
                  <Link href={`/admin/users/${c.buyer.id}`} className="font-medium text-exeter hover:underline">
                    {c.buyer.anonymousHandle ?? 'Anonymous'}
                  </Link>
                </td>
                <td className="px-4 py-2.5">
                  <Link href={`/admin/users/${c.seller.id}`} className="font-medium text-exeter hover:underline">
                    {c.seller.anonymousHandle ?? 'Anonymous'}
                  </Link>
                </td>
                <td className="px-4 py-2.5 tabular-nums">{c._count.messages}</td>
                <td className="px-4 py-2.5 text-muted">
                  {c.lastMessageAt.toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </td>
                <td className="px-4 py-2.5 text-right">
                  <Link href={`/admin/conversations/${c.id}`} className="text-[12px] font-medium text-exeter hover:underline">
                    View thread
                  </Link>
                </td>
              </tr>
            ))}
            {conversations.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted">
                  No conversations
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Pagination page={page} totalPages={totalPages} basePath="/admin/conversations" />
    </div>
  );
}
