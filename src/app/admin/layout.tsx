import { requireAdminPage } from '@/lib/admin-auth';
import AdminSidebar from '@/components/admin/AdminSidebar';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdminPage();

  return (
    <div className="flex min-h-dvh bg-background text-foreground">
      <AdminSidebar />
      <main className="flex-1 overflow-x-auto px-8 py-6">{children}</main>
    </div>
  );
}
