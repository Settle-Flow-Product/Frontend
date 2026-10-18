import { redirect } from 'next/navigation';

import { currentCaller } from '@/lib/session';
import { tableModules } from '@/app/_actions/table';
import { Sidebar } from './_components/sidebar';

/**
 * The second of the three checks.
 *
 * Middleware saw a cookie; this verifies the token and reads the account, so a suspended operator
 * with a still-valid token gets no further. Every server action asks a third time before touching
 * anything — this one only decides whether to draw a screen.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const caller = await currentCaller();
  if (caller === null) redirect('/auth/login');

  const modules = await tableModules();

  return (
    <div className="flex min-h-screen">
      <Sidebar modules={modules} email={caller.account.email} roles={caller.account.roles} />
      <main className="min-w-0 flex-1 p-6">{children}</main>
    </div>
  );
}
