import AdminOverviewDashboard from '@/components/admin/AdminOverviewDashboard';
import { getAdminMetrics, serializeAdminMetrics } from '@/lib/admin-metrics';

export default async function AdminOverviewPage() {
  const metrics = serializeAdminMetrics(await getAdminMetrics());
  return <AdminOverviewDashboard initial={metrics} />;
}
