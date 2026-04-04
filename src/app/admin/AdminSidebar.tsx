'use client';

import { useState, useEffect } from 'react';
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
  Radar,
  MessageCircleWarning,
  LayoutDashboard,
  CreditCard,
  Globe,
  Send,
  BookTemplate,
  Inbox,
  FlaskConical,
  TrendingUp,
  ShieldAlert,
  Route,
  Key,
  Shield,
  Webhook,
  GraduationCap,
  Palette,
  ScanSearch,
  Zap,
  Lightbulb,
  User,
  Users,
  Menu,
  X,
  Star,
  MapPin,
  Gift,
  Code,
} from 'lucide-react';

interface SidebarProps {
  user: { id: string; email?: string };
  tenant: { id: number; name: string; slug: string; plan: string };
  role: 'owner' | 'manager' | 'staff';
  stores: Array<{ id: number; name: string; slug: string }>;
}

interface NavItem {
  href: string;
  label: string;
  icon: any;
  exact?: boolean;
  ownerOnly?: boolean;
  section?: string;
}

const NAV_SECTIONS: { title: string; items: NavItem[] }[] = [
  {
    title: '',
    items: [
      { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
    ],
  },
  {
    title: 'Core Flow',
    items: [
      { href: '/admin/settings/google', label: '1. Google Business', icon: LinkIcon, ownerOnly: true },
      { href: '/admin/stores/setup', label: '2. Store Setup', icon: Store },
      { href: '/admin/qr-codes', label: '3. QR Codes', icon: QrCode },
      { href: '/admin/reviews', label: '4. Reviews & AI Reply', icon: MessageSquare },
      { href: '/admin/templates', label: '5. Reply Templates', icon: BookTemplate },
      { href: '/admin/analytics/scans', label: '6. QR Scan Analytics', icon: BarChart3 },
    ],
  },
  {
    title: 'Team',
    items: [
      { href: '/admin/settings/team', label: 'Members', icon: Users },
      { href: '/admin/team/inbox', label: 'Team Inbox', icon: Inbox },
      { href: '/admin/invites', label: 'Invites', icon: Send },
      { href: '/admin/settings/notifications', label: 'Notifications', icon: Bell },
      { href: '/admin/referrals', label: 'Referrals', icon: Gift },
    ],
  },
  {
    title: 'Analytics',
    items: [
      { href: '/admin/analytics/insights', label: 'Review Insights', icon: Lightbulb },
      { href: '/admin/analytics/google-maps', label: 'Google Maps', icon: MapPin },
      { href: '/admin/analytics/competitors', label: 'Competitors', icon: BarChart3 },
      { href: '/admin/reports', label: 'Weekly Reports', icon: FileText },
    ],
  },
  {
    title: 'Advanced',
    items: [
      { href: '/admin/analytics/predictions', label: 'Predictions', icon: TrendingUp },
      { href: '/admin/analytics/anomalies', label: 'Anomaly Detection', icon: ShieldAlert },
      { href: '/admin/analytics/journeys', label: 'Customer Journey', icon: Route },
      { href: '/admin/analytics/audit', label: 'Review Auditor', icon: ScanSearch },
      { href: '/admin/feedback', label: 'Feedback', icon: MessageCircleWarning },
      { href: '/admin/scanner', label: 'Review Scanner', icon: Radar },
      { href: '/admin/experiments', label: 'A/B Tests', icon: FlaskConical },
      { href: '/admin/settings/ai-training', label: 'AI Training', icon: GraduationCap, ownerOnly: true },
      { href: '/admin/settings/realtime', label: 'Real-Time Reviews', icon: Zap, ownerOnly: true },
    ],
  },
  {
    title: 'Sales',
    items: [
      { href: '/admin/demo-prep', label: 'Demo Prep', icon: Zap, ownerOnly: true },
    ],
  },
  {
    title: 'Settings',
    items: [
      { href: '/admin/settings/platforms', label: 'Platforms', icon: Globe, ownerOnly: true },
      { href: '/admin/settings/api', label: 'API Keys', icon: Key, ownerOnly: true },
      { href: '/admin/settings/webhooks', label: 'Webhooks', icon: Webhook, ownerOnly: true },
      { href: '/admin/settings/whitelabel', label: 'White Label', icon: Palette, ownerOnly: true },
      { href: '/admin/settings/widget', label: 'Review Widget', icon: Code, ownerOnly: true },
      { href: '/admin/settings/profile', label: 'Profile & Language', icon: User },
      { href: '/admin/settings/billing', label: 'Billing', icon: CreditCard, ownerOnly: true },
    ],
  },
];

export default function AdminSidebar({ user, tenant, role, stores }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close mobile menu on navigation
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/auth/login');
  }

  /* ── Shared sidebar content ── */
  const sidebarContent = (
    <>
      {/* Tenant Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#E8654A] to-[#FFBF00] shrink-0">
            <Star className="h-4 w-4 text-white fill-white" />
          </div>
          <div className="min-w-0">
            <h2 className="font-bold text-gray-900 truncate text-sm">{tenant.name}</h2>
            <p className="text-[10px] text-gray-500">
              {stores.length} store{stores.length !== 1 ? 's' : ''} &middot; {tenant.plan} plan
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {NAV_SECTIONS.map((section, si) => {
          const filteredItems = section.items.filter(item => {
            if (item.ownerOnly && role === 'staff') return false;
            return true;
          });
          if (filteredItems.length === 0) return null;

          return (
            <div key={si} className={section.title ? 'pt-4 first:pt-0' : ''}>
              {section.title && (
                <p className="px-3 pb-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                  {section.title}
                </p>
              )}
              {filteredItems.map((item) => {
                const isActive = item.exact
                  ? pathname === item.href
                  : pathname.startsWith(item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-[#FFF7ED] text-[#E8654A]'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>

      {/* Super Admin link (only for maxliao2020@gmail.com) */}
      {user.email === 'maxliao2020@gmail.com' && (
        <div className="px-3 pb-1">
          <Link
            href="/admin/super"
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              pathname.startsWith('/admin/super')
                ? 'bg-red-50 text-red-600'
                : 'text-gray-400 hover:bg-red-50 hover:text-red-600'
            }`}
          >
            <Shield className="w-4 h-4 shrink-0" />
            Super Admin
          </Link>
        </div>
      )}

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
    </>
  );

  return (
    <>
      {/* ── Mobile: hamburger button (fixed, always visible on small screens) ── */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-3 left-3 z-40 p-2.5 bg-white rounded-xl shadow-md border border-gray-200 hover:bg-gray-50 transition-colors"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5 text-gray-700" />
      </button>

      {/* ── Mobile: slide-out drawer ── */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          {/* Drawer */}
          <aside className="relative w-72 max-w-[85vw] bg-white h-full flex flex-col shadow-2xl animate-in slide-in-from-left duration-200">
            {/* Close button */}
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-3 right-3 p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 z-10"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* ── Desktop: static sidebar ── */}
      <aside className="hidden lg:flex w-64 bg-white border-r border-gray-200 flex-col shrink-0">
        {sidebarContent}
      </aside>
    </>
  );
}
