import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import ConfirmButton from '@/components/admin/ConfirmButton';
import {
  deleteTicketAction,
  setTicketStatusAction,
  createPinAction,
  deletePinAction,
  togglePinOpenAction,
} from '@/lib/admin-actions';

export default async function AdminNightlifePage() {
  const [tickets, pins] = await Promise.all([
    prisma.nightlifeTicket.findMany({
      orderBy: { eventDate: 'desc' },
      take: 100,
      include: { seller: { select: { id: true, anonymousHandle: true } } },
    }),
    prisma.nightlifePin.findMany({ orderBy: { createdAt: 'desc' } }),
  ]);

  return (
    <div className="max-w-5xl space-y-10">
      <div>
        <h1 className="text-[20px] font-bold text-foreground">Nightlife</h1>
        <p className="mt-1 text-[13px] text-muted">Resale tickets and map pins.</p>
      </div>

      <section>
        <h2 className="text-[14px] font-semibold text-foreground">Tickets ({tickets.length})</h2>
        <div className="mt-3 overflow-hidden rounded-2xl ring-1 ring-divider">
          <table className="w-full text-left text-[13px]">
            <thead className="bg-surface/70 text-[11px] uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-2.5 font-semibold">Title</th>
                <th className="px-4 py-2.5 font-semibold">Venue</th>
                <th className="px-4 py-2.5 font-semibold">Seller</th>
                <th className="px-4 py-2.5 font-semibold">Price</th>
                <th className="px-4 py-2.5 font-semibold">Event date</th>
                <th className="px-4 py-2.5 font-semibold">Status</th>
                <th className="px-4 py-2.5 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((t, i) => (
                <tr
                  key={t.id}
                  className="row-in border-t border-divider/60"
                  style={{ animationDelay: `${Math.min(i * 0.025, 0.3)}s` }}
                >
                  <td className="px-4 py-2.5 text-foreground">{t.title}</td>
                  <td className="px-4 py-2.5 text-muted">{t.venue}</td>
                  <td className="px-4 py-2.5">
                    <Link href={`/admin/users/${t.seller.id}`} className="font-medium text-exeter hover:underline">
                      {t.seller.anonymousHandle ?? 'Anonymous'}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5 tabular-nums">£{t.price}</td>
                  <td className="px-4 py-2.5 text-muted">
                    {t.eventDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                  </td>
                  <td className="px-4 py-2.5">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                        t.status === 'sold'
                          ? 'bg-surface-hover text-muted'
                          : t.status === 'reserved'
                            ? 'bg-amber-500/10 text-amber-600'
                            : 'bg-exeter/10 text-exeter'
                      }`}
                    >
                      {t.status}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <div className="flex justify-end gap-3">
                      {t.status !== 'active' && (
                        <form action={setTicketStatusAction}>
                          <input type="hidden" name="id" value={t.id} />
                          <input type="hidden" name="status" value="active" />
                          <button className="text-[12px] font-medium text-exeter hover:underline">
                            Reactivate
                          </button>
                        </form>
                      )}
                      <form action={deleteTicketAction}>
                        <input type="hidden" name="id" value={t.id} />
                        <ConfirmButton
                          confirmMessage="Permanently delete this ticket listing?"
                          className="text-[12px] font-medium text-red-500 hover:underline"
                        >
                          Delete
                        </ConfirmButton>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
              {tickets.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted">
                    No tickets
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="text-[14px] font-semibold text-foreground">Map pins ({pins.length})</h2>

        <form
          action={createPinAction}
          className="mt-3 grid grid-cols-2 gap-3 rounded-2xl bg-surface/50 p-4 ring-1 ring-divider sm:grid-cols-3 lg:grid-cols-6"
        >
          <input
            name="name"
            required
            placeholder="Name"
            className="col-span-2 rounded-lg bg-background px-3 py-2 text-[13px] ring-1 ring-divider focus:outline-none focus:ring-2 focus:ring-exeter/30"
          />
          <select
            name="type"
            className="rounded-lg bg-background px-3 py-2 text-[13px] ring-1 ring-divider focus:outline-none focus:ring-2 focus:ring-exeter/30"
          >
            <option value="nightclub">Nightclub</option>
            <option value="house-party">House party</option>
          </select>
          <input
            name="address"
            required
            placeholder="Address"
            className="col-span-2 rounded-lg bg-background px-3 py-2 text-[13px] ring-1 ring-divider focus:outline-none focus:ring-2 focus:ring-exeter/30"
          />
          <input
            name="mapsQuery"
            placeholder="Maps query"
            className="rounded-lg bg-background px-3 py-2 text-[13px] ring-1 ring-divider focus:outline-none focus:ring-2 focus:ring-exeter/30"
          />
          <input
            name="lat"
            type="number"
            step="any"
            required
            placeholder="Lat"
            className="rounded-lg bg-background px-3 py-2 text-[13px] ring-1 ring-divider focus:outline-none focus:ring-2 focus:ring-exeter/30"
          />
          <input
            name="lng"
            type="number"
            step="any"
            required
            placeholder="Lng"
            className="rounded-lg bg-background px-3 py-2 text-[13px] ring-1 ring-divider focus:outline-none focus:ring-2 focus:ring-exeter/30"
          />
          <button className="col-span-2 rounded-lg bg-exeter px-3 py-2 text-[13px] font-semibold text-white sm:col-span-1 lg:col-span-6">
            Add pin
          </button>
        </form>

        <div className="mt-3 overflow-hidden rounded-2xl ring-1 ring-divider">
          <table className="w-full text-left text-[13px]">
            <thead className="bg-surface/70 text-[11px] uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-2.5 font-semibold">Name</th>
                <th className="px-4 py-2.5 font-semibold">Type</th>
                <th className="px-4 py-2.5 font-semibold">Address</th>
                <th className="px-4 py-2.5 font-semibold">Open</th>
                <th className="px-4 py-2.5 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pins.map((p, i) => (
                <tr
                  key={p.id}
                  className="row-in border-t border-divider/60"
                  style={{ animationDelay: `${Math.min(i * 0.025, 0.3)}s` }}
                >
                  <td className="px-4 py-2.5 text-foreground">{p.name}</td>
                  <td className="px-4 py-2.5 text-muted">{p.type}</td>
                  <td className="px-4 py-2.5 text-muted">{p.address}</td>
                  <td className="px-4 py-2.5">
                    <form action={togglePinOpenAction}>
                      <input type="hidden" name="id" value={p.id} />
                      <input type="hidden" name="isOpen" value={String(p.isOpen)} />
                      <button
                        className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                          p.isOpen ? 'bg-exeter/10 text-exeter' : 'bg-surface-hover text-muted'
                        }`}
                      >
                        {p.isOpen ? 'Open' : 'Closed'}
                      </button>
                    </form>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <form action={deletePinAction}>
                      <input type="hidden" name="id" value={p.id} />
                      <ConfirmButton
                        confirmMessage={`Delete pin "${p.name}"?`}
                        className="text-[12px] font-medium text-red-500 hover:underline"
                      >
                        Delete
                      </ConfirmButton>
                    </form>
                  </td>
                </tr>
              ))}
              {pins.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted">
                    No pins
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
