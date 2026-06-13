'use client';

import { motion } from 'framer-motion';
import { MapPin, Navigation, Music2, Home } from 'lucide-react';
import type { NightlifePin } from '@/types';

interface NightlifeVenueCardProps {
  pin: NightlifePin;
  index: number;
}

export default function NightlifeVenueCard({ pin, index }: NightlifeVenueCardProps) {
  const isClub = pin.type === 'nightclub';
  const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${pin.lat},${pin.lng}`)}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.35 }}
      className="rounded-2xl bg-surface/60 p-4 ring-1 ring-divider"
    >
      <div className="flex items-start gap-3">
        <div
          className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl ${
            isClub ? 'bg-exeter/15 text-exeter' : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
          }`}
        >
          {isClub ? (
            <Music2 className="h-5 w-5" strokeWidth={2} />
          ) : (
            <Home className="h-5 w-5" strokeWidth={2} />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-[15px] font-semibold text-foreground leading-snug">{pin.name}</h3>
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                pin.isOpen
                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                  : 'bg-surface text-muted'
              }`}
            >
              {pin.isOpen ? 'Open' : 'Closed'}
            </span>
          </div>
          <p className="mt-1 flex items-start gap-1 text-[12px] text-muted leading-snug">
            <MapPin className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" strokeWidth={2} />
            {pin.address}
          </p>
        </div>
      </div>
      <a
        href={mapsUrl}
        target="_blank"
        rel="noreferrer"
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-background py-2.5 text-[12px] font-semibold text-foreground ring-1 ring-divider transition-colors hover:bg-surface"
      >
        <Navigation className="h-3.5 w-3.5" strokeWidth={2} />
        Get directions
      </a>
    </motion.div>
  );
}
