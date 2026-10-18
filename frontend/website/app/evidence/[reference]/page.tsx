import { Evidence } from '@/components/Evidence';

export const metadata = { title: 'Evidence · SettleFlow' };

export default async function EvidencePage({ params }: { params: Promise<{ reference: string }> }) {
  const { reference } = await params;
  return <Evidence id={reference} />;
}
