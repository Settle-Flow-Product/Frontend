import type { Metadata } from 'next';
import './globals.css';

import { SessionBar } from '@/components/SessionBar';
import { Badge } from '@/components/ui/badge';

export const metadata: Metadata = {
  title: 'SettleFlow',
  description: 'Vendor payments with an internal approval gate, on Stellar',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <div className="mx-auto max-w-3xl px-4 py-6">
          <header className="mb-6 flex items-baseline justify-between border-b pb-3">
            <a href="/requests" className="text-lg font-bold tracking-tight">
              SettleFlow
            </a>
            <div className="flex items-center gap-3">
              <SessionBar />
              <Badge variant="warn">Testnet</Badge>
            </div>
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}
