interface AdminTableProps {
  children: React.ReactNode;
}

export default function AdminTable({ children }: AdminTableProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-divider bg-background shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-[13px]">{children}</table>
      </div>
    </div>
  );
}

export function AdminTableHead({ children }: { children: React.ReactNode }) {
  return (
    <thead className="border-b border-divider bg-surface/80 text-[10px] uppercase tracking-[0.08em] text-muted">
      {children}
    </thead>
  );
}

export function AdminTableEmpty({ colSpan, message }: { colSpan: number; message: string }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-12 text-center text-[13px] text-muted">
        {message}
      </td>
    </tr>
  );
}
