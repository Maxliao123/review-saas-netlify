import { validateMemberToken } from '@/lib/member-token';
import { redirect } from 'next/navigation';
import MemberShell from './member-shell';

export const metadata = {
  title: 'My Membership',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
  referrer: 'no-referrer',
};

export default async function MemberLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const { valid, member } = await validateMemberToken(token);

  if (!valid || !member) {
    redirect('/');
  }

  const memberData = {
    id: member.id,
    name: member.name,
    phone: member.phone,
    points_balance: member.points_balance || 0,
  };

  const storeData = {
    id: member.stores?.id,
    name: member.stores?.name || 'Store',
  };

  return (
    <MemberShell token={token} member={memberData} store={storeData}>
      {children}
    </MemberShell>
  );
}
