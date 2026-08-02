'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  MessageSquare,
  ShoppingBag,
  PartyPopper,
  Flag,
  Mail,
  ExternalLink,
} from 'lucide-react';

const NAV = [
  { href: '/admin', label: 'Overview', icon: LayoutDashboard, exact: true },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/posts', label: 'Posts', icon: MessageSquare },
  { href: '/admin/comments', label: 'Comments', icon: MessageSquare },
  { href: '/admin/listings', label: 'Listings', icon: ShoppingBag },
  { href: '/admin/nightlife', label: 'Nightlife', icon: PartyPopper },
  { href: '/admin/reports', label: 'Reports', icon: Flag },
  { href: '/admin/conversations', label: 'Conversations', icon: Mail },
];

export default function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-dvh w-56 flex-shrink-0 flex-col border-r border-divider bg-surface/40 px-3 py-5">
      <div className="mb-6 flex items-center gap-2 px-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-exeter text-[13px] font-bold text-white">
          Y
        </div>
        <span className="text-[14px] font-bold text-foreground">Admin</span>
      </div>

      <nav className="flex-1 space-y-0.5">
        {NAV.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors ${
                active
                  ? 'bg-exeter/10 text-exeter'
                  : 'text-muted hover:bg-surface hover:text-foreground'
              }`}
            >
              <Icon className="h-4 w-4" strokeWidth={1.8} />
              {label}
            </Link>
          );
        })}
      </nav>

      <Link
        href="/"
        className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-[12px] font-medium text-muted-light transition-colors hover:bg-surface hover:text-foreground"
      >
        <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.8} />
        Back to app
      </Link>
    </aside>
  );
}
