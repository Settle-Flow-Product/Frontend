import { Approve } from '@/components/Approve';

export const metadata = { title: 'Approve payment · SettleFlow' };

export default async function ApprovePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <Approve id={id} />;
}
