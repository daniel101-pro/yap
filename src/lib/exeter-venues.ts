/** Exeter nightlife venues. Fixr ticket-shop IDs from venue sites. */
export type ExeterTicketVenue = {
  name: string;
  displayVenue: string;
  aliases: string[];
  fixrShopId?: string;
  fixrVenueUrl?: string;
};

/** MyNightOut browse: club section order (Timepiece first). */
export const EXETER_CLUB_DISPLAY_ORDER = [
  'Timepiece',
  'Move',
  'Arena',
  'Bomba',
  'Phoenix',
  'Fever',
  'Cavern',
  'Vaults',
  'Core',
  'Luna',
  'Castle',
  'Bootlegger',
] as const;

export function compareExeterVenueSections(a: string, b: string): number {
  const rank = (name: string) => {
    const lower = name.toLowerCase();
    for (let i = 0; i < EXETER_CLUB_DISPLAY_ORDER.length; i++) {
      const key = EXETER_CLUB_DISPLAY_ORDER[i]!.toLowerCase();
      if (lower.includes(key)) return i;
    }
    return EXETER_CLUB_DISPLAY_ORDER.length + lower.charCodeAt(0);
  };
  const ra = rank(a);
  const rb = rank(b);
  if (ra !== rb) return ra - rb;
  return a.localeCompare(b);
}

export const EXETER_TICKET_VENUES: ExeterTicketVenue[] = [
  {
    name: 'Timepiece',
    displayVenue: 'Timepiece',
    aliases: ['timepiece', 'time piece', 'timepiec', 'tp'],
    fixrShopId: '34477de5-1656-4cc5-b3c6-d1518f6f4579',
    fixrVenueUrl: 'https://fixr.co/venue/2783',
  },
  {
    name: 'Arena',
    displayVenue: 'Arena Exeter',
    aliases: ['arena', 'arena exeter', 'arena.'],
  },
  {
    name: 'Move',
    displayVenue: 'Move Exeter',
    aliases: ['move', 'move exeter'],
  },
  {
    name: 'Bomba',
    displayVenue: 'Bomba Exeter',
    aliases: ['bomba'],
  },
  {
    name: 'Phoenix',
    displayVenue: 'Exeter Phoenix',
    aliases: ['phoenix', 'exeter phoenix'],
  },
];

export function matchingVenuesForSearch(query: string): ExeterTicketVenue[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  return EXETER_TICKET_VENUES.filter((venue) => {
    const name = venue.name.toLowerCase();
    const display = venue.displayVenue.toLowerCase();
    if (q.includes(name) || name.includes(q) || q.includes(display)) return true;
    return venue.aliases.some((alias) => {
      if (q.includes(alias) || alias.includes(q)) return true;
      if (q.length >= 4 && alias.length >= 4 && alias.startsWith(q.slice(0, 4))) return true;
      return false;
    }) || (venue.name === 'Timepiece' && /timep|piece|tp/i.test(q));
  });
}
