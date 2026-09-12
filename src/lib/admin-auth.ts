import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { isExeterEmail } from '@/lib/auth-utils';

function getAdminEmails(): Set<string> {
  return new Set(
    (process.env.ADMIN_EMAILS ?? '')
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return getAdminEmails().has(email.toLowerCase());
}

/** Use in admin server components/layouts — redirects non-admins away. */
export async function requireAdminPage() {
  const session = await auth();
  if (!session?.user?.id || !isAdminEmail(session.user.email) || !isExeterEmail(session.user.email ?? '')) {
    redirect('/');
  }
  return session;
}

/** Use in server actions — actions can be invoked directly, so re-check independently of the UI. */
export async function requireAdminAction() {
  const session = await auth();
  if (!session?.user?.id || !isAdminEmail(session.user.email) || !isExeterEmail(session.user.email ?? '')) {
    throw new Error('Forbidden');
  }
  return session;
}
