import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SettleFlow · operations',
  description: 'What the system did, and what needs looking at',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
