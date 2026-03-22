export function timeAgo(date: Date): string {
  const now = Date.now();
  const diff = now - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m`;
  if (hours < 24) return `${hours}h`;
  if (days < 7) return `${days}d`;
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export function formatNumber(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toString();
}

export { getCategoryIcon, getReactionIcon } from './icons';

export function getCategoryLabel(category: string): string {
  const map: Record<string, string> = {
    confessions: 'Confessions',
    'hot-takes': 'Hot Takes',
    questions: 'Questions',
    memes: 'Memes',
    events: 'Events',
    rants: 'Rants',
    advice: 'Advice',
    textbooks: 'Textbooks',
    electronics: 'Electronics',
    furniture: 'Furniture',
    clothing: 'Clothing',
    bikes: 'Bikes',
    tickets: 'Tickets',
    other: 'Other',
  };
  return map[category] || category;
}

export function getConditionLabel(condition: string): string {
  const map: Record<string, string> = {
    new: 'Brand New',
    'like-new': 'Like New',
    good: 'Good',
    fair: 'Fair',
  };
  return map[condition] || condition;
}
