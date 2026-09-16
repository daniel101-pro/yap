/** Entry slot with the most completed/reserved buys (needs at least `minSales`). */
export function pickTrendingSlotId(
  counts: Record<string, number>,
  ticketOrder: string[],
  minSales = 2,
): string | null {
  let best = 0;
  const tied: string[] = [];

  for (const [id, n] of Object.entries(counts)) {
    if (n > best) {
      best = n;
      tied.length = 0;
      tied.push(id);
    } else if (n === best && n > 0) {
      tied.push(id);
    }
  }

  if (best < minSales) return null;
  if (tied.length === 1) return tied[0]!;

  for (const id of ticketOrder) {
    if (tied.includes(id)) return id;
  }
  return tied[0] ?? null;
}
