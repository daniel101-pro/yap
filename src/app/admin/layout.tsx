import { requireAdminPage } from '@/lib/admin-auth';
import AdminSidebar from '@/components/admin/AdminSidebar';

const NO_FLASH_THEME_SCRIPT = `(function(){try{var p=localStorage.getItem('theme-preference');var d=p==='dark'||(p!=='light'&&window.matchMedia('(prefers-color-scheme: dark)').matches);if(d)document.documentElement.classList.add('dark');}catch(e){}})();`;

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdminPage();

  return (
    <div className="flex min-h-dvh bg-background text-foreground">
      <script dangerouslySetInnerHTML={{ __html: NO_FLASH_THEME_SCRIPT }} />
      <AdminSidebar />
      <main className="flex-1 overflow-x-auto px-8 py-6">{children}</main>
    </div>
  );
}
