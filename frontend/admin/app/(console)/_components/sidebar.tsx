'use client';

import { Database, Gauge, LogOut } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { Badge } from '@/components/ui/badge';
import type { Module } from '@/types/table';
import { publicPath } from '@/lib/base-path';
import { cn } from '@/lib/utils';

export function Sidebar({
  modules,
  email,
  roles,
}: {
  modules: Module[];
  email: string;
  roles: string[];
}) {
  const path = usePathname();

  return (
    <aside className="bg-card flex w-60 shrink-0 flex-col border-r">
      <div className="border-b px-4 py-4">
        <p className="font-bold tracking-tight">SettleFlow</p>
        <p className="text-muted-foreground text-xs">operations</p>
      </div>

      <nav className="flex-1 overflow-y-auto p-2">
        {/* `<Link>` rather than `<a>`, here and below: Next prefixes the basePath onto a Link's
            href and leaves a plain anchor's alone. Both hrefs are therefore written from the app
            root, which is also what usePathname() reports — so the active check is a comparison
            rather than a prefix-stripping exercise. */}
        <Link
          href="/"
          className={cn(
            'mb-2 flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors',
            path === '/' ? 'bg-accent text-accent-foreground font-semibold' : 'hover:bg-accent/50',
          )}
        >
          <Gauge className="size-4" />
          Dashboard
        </Link>

        <p className="text-muted-foreground px-3 pt-2 pb-1 text-[11px] font-semibold tracking-wide uppercase">
          Tables
        </p>

        {modules.map((m) => {
          const href = `/${m.slug}`;
          const active = path === href || path.startsWith(`${href}/`);
          return (
            <Link
              key={m.slug}
              href={href}
              title={m.readOnlyBecause ?? undefined}
              className={cn(
                'flex items-center justify-between gap-2 rounded-md px-3 py-1.5 text-sm transition-colors',
                active ? 'bg-accent text-accent-foreground font-semibold' : 'hover:bg-accent/50',
              )}
            >
              <span className="flex min-w-0 items-center gap-2">
                <Database className="size-3.5 shrink-0 opacity-60" />
                <span className="truncate">{m.title}</span>
              </span>
              {/* Read-only is stated, not implied by a missing button. */}
              {!m.writable ? (
                <span className="text-muted-foreground text-[10px] uppercase">ro</span>
              ) : null}
            </Link>
          );
        })}
      </nav>

      <div className="space-y-2 border-t p-3">
        <p className="truncate text-xs" title={email}>
          {email}
        </p>
        <div className="flex flex-wrap gap-1">
          {roles.map((r) => (
            <Badge key={r} variant="secondary" className="text-[10px]">
              {r}
            </Badge>
          ))}
        </div>
        {/* A real form submission, not a Next navigation — the browser resolves this against the
            origin and Next never sees it, so the prefix has to be written in. */}
        <form action={publicPath('/api/auth/logout')} method="post">
          <button
            type="submit"
            className="text-muted-foreground hover:text-foreground flex items-center gap-1.5 text-xs transition-colors"
          >
            <LogOut className="size-3" />
            Sign out
          </button>
        </form>
      </div>
    </aside>
  );
}
