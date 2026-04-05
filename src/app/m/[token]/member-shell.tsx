'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface MemberShellProps {
  token: string;
  member: { id: string; name: string; phone: string; points_balance: number };
  store: { id: number; name: string };
  children: React.ReactNode;
}

export default function MemberShell({ token, store, children }: MemberShellProps) {
  const pathname = usePathname();
  const base = `/m/${token}`;

  const navItems = [
    { href: base, label: 'Home', icon: HomeIcon, exact: true },
    { href: `${base}/book`, label: 'Book', icon: CalendarIcon, exact: false },
    { href: `${base}/history`, label: 'History', icon: ClockIcon, exact: false },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col max-w-md mx-auto">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-center sticky top-0 z-10">
        <h1 className="text-lg font-semibold text-gray-900">{store.name}</h1>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto pb-20">
        {children}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-10">
        <div className="max-w-md mx-auto flex">
          {navItems.map((item) => {
            const isActive = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex-1 flex flex-col items-center py-2 text-xs ${
                  isActive ? 'text-[#E8654A]' : 'text-gray-500'
                }`}
              >
                <item.icon active={isActive} />
                <span className="mt-1">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

function HomeIcon({ active }: { active: boolean }) {
  return (
    <svg className="w-6 h-6" fill={active ? '#E8654A' : 'none'} stroke={active ? '#E8654A' : 'currentColor'} viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955a1.126 1.126 0 0 1 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
    </svg>
  );
}

function CalendarIcon({ active }: { active: boolean }) {
  return (
    <svg className="w-6 h-6" fill={active ? '#E8654A' : 'none'} stroke={active ? '#E8654A' : 'currentColor'} viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
    </svg>
  );
}

function ClockIcon({ active }: { active: boolean }) {
  return (
    <svg className="w-6 h-6" fill={active ? '#E8654A' : 'none'} stroke={active ? '#E8654A' : 'currentColor'} viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  );
}
