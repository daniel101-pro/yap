import { Search } from 'lucide-react';

export default function SearchBox({
  action,
  defaultValue,
  placeholder = 'Search…',
}: {
  action: string;
  defaultValue?: string;
  placeholder?: string;
}) {
  return (
    <form action={action} method="GET" className="relative w-72">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-light" />
      <input
        type="text"
        name="q"
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="w-full rounded-lg bg-surface py-2 pl-8 pr-3 text-[13px] text-foreground placeholder:text-muted-light focus:outline-none focus:ring-2 focus:ring-exeter/30"
      />
    </form>
  );
}
