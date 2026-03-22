import {
  EyeOff,
  Flame,
  HelpCircle,
  Skull,
  Calendar,
  Zap,
  Lightbulb,
  BookOpen,
  Laptop,
  Armchair,
  Shirt,
  Bike,
  Ticket,
  Package,
  Pencil,
  ShoppingBag,
  ShieldOff,
  Check,
  Eye,
  type LucideIcon,
} from 'lucide-react';

const categoryIconMap: Record<string, LucideIcon> = {
  confessions: EyeOff,
  'hot-takes': Flame,
  questions: HelpCircle,
  memes: Skull,
  events: Calendar,
  rants: Zap,
  advice: Lightbulb,
  textbooks: BookOpen,
  electronics: Laptop,
  furniture: Armchair,
  clothing: Shirt,
  bikes: Bike,
  tickets: Ticket,
  other: Package,
};

export function getCategoryIcon(category: string): LucideIcon {
  return categoryIconMap[category] || Pencil;
}

const reactionIconMap: Record<string, LucideIcon> = {
  fire: Flame,
  cap: ShieldOff,
  dead: Skull,
  real: Check,
  sus: Eye,
};

export function getReactionIcon(reaction: string): LucideIcon {
  return reactionIconMap[reaction] || Flame;
}

export function getMarketAllIcon(): LucideIcon {
  return ShoppingBag;
}
