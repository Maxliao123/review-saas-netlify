'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import {
  MessageSquare,
  BarChart3,
  Settings,
  FileText,
  Store,
  QrCode,
  Bell,
  LogOut,
  Link as LinkIcon,
} from 'lucide-react';

interface SidebarProps {
  user: { id: string; email?: string };
  tenant: { id: number; name: string; slug: string; plan: string };
  role: 'owner' | 'manager' | 'staff';
  stores: Array<{ id: number; name: string; slug: string }>;
}

const NAV_ITEMS = [
  { href: '/admin/reviews', label: 'Reviews', icon: MessageSquare },
  { href: '/admin/analytics/scans', label: 'Scan Analytics', icon: QrCode },
  { href: '/admin/reports', label: 'Weekly Reports', icon: FileText },
  { href: '/admin/stores/setup', label: 'Store Setup', icon: Store },
  { href: '/admin/settings/notifications', label: 'Notifications', icon: Bell },
  { href: '/admin/settings/google', label: 'Google Business', icon: LinkIcon, ownerOnly: true },
];

export default function AdminSidebar({ user, tenant, role, stores }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/auth/login');
  }

  const filteredNav = NAV_ITEMS.filter(item => {
    if (item.ownerOnly && role === 'staff') return false;
    return true;
  });

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
      {/* Tenant Header */}
      <div className="p-4 border-b border-gray-200">
        <h2 className="font-bold text-gray-900 truncate">{tenant.name}</h2>
        <p className="text-xs text-gray-500 mt-0.5">
          {stores.length} store{stores.length !== 1 ? 's' : ''} &middot; {tenant.plan} plan
        </p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1">
        {filteredNav.map((item) => {
          const isActive = pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User Footer */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {user.email}
            </p>
            <p className="text-xs text-gray-500 capitalize">{role}</p>
          </div>
          <button
            onClick={handleLogout}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
