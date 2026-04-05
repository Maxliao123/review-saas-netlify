'use client';

import Link from 'next/link';

const STAT_CARDS = [
  { label: 'Monthly Revenue', labelZh: '本月營收', value: '$12,580', change: '+12%', changeUp: true, icon: '💰' },
  { label: 'Orders', labelZh: '訂單數', value: '156', change: '+8%', changeUp: true, icon: '📦' },
  { label: 'Members', labelZh: '會員數', value: '89', change: '+5', changeUp: true, icon: '👥' },
  { label: 'Avg Order', labelZh: '客單價', value: '$80.6', change: '+3%', changeUp: true, icon: '📈' },
];

const DAILY_REVENUE = [
  { day: 'Mon', amount: 1450 },
  { day: 'Tue', amount: 1280 },
  { day: 'Wed', amount: 1890 },
  { day: 'Thu', amount: 1650 },
  { day: 'Fri', amount: 2100 },
  { day: 'Sat', amount: 2450 },
  { day: 'Sun', amount: 1760 },
];

const TOP_PRODUCTS = [
  { name: 'Spring Bouquet DIY Kit', sales: 42, revenue: '$2,856' },
  { name: 'Gel Nail Art Starter Set', sales: 35, revenue: '$1,575' },
  { name: 'Dried Flower Frame Kit', sales: 28, revenue: '$1,540' },
  { name: 'Premium Floral Scissors', sales: 24, revenue: '$672' },
  { name: 'Nail Drill Machine Pro', sales: 12, revenue: '$1,440' },
];

const RECENT_ORDERS = [
  { id: 'BS-2026-0412', customer: 'Emily Chen', total: '$98.00', status: 'Paid', statusColor: 'text-emerald-400' },
  { id: 'BS-2026-0411', customer: 'Jessica Wang', total: '$80.00', status: 'Shipped', statusColor: 'text-blue-400' },
  { id: 'BS-2026-0410', customer: 'Sarah Liu', total: '$120.00', status: 'Shipped', statusColor: 'text-blue-400' },
];

export default function DemoDashboardPage() {
  const maxRevenue = Math.max(...DAILY_REVENUE.map((d) => d.amount));

  return (
    <div className="min-h-screen bg-[#07070d] text-[#ededf5]">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 sm:px-8 py-4 border-b border-white/[0.07]">
        <Link href="/p/quote" className="text-sm text-[#6b6b96] hover:text-white transition-colors">
          &larr; Back
        </Link>
        <span className="text-[11px] text-[#6b6b96] bg-[#E8654A]/10 border border-[#E8654A]/30 px-3 py-1 rounded-full font-medium tracking-wide">
          DEMO &middot; 展示用
        </span>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold">商家後台 &middot; Dashboard</h1>
          <p className="text-sm text-[#6b6b96] mt-1">Bloom Studio</p>
        </div>

        {/* AI Alert */}
        <div className="bg-amber-500/[0.06] border border-amber-500/20 rounded-xl px-5 py-4 mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="text-lg">&#9888;&#65039;</span>
            <div>
              <div className="text-sm font-semibold text-amber-300">AI Smart Alert</div>
              <div className="text-sm text-amber-200/70 mt-0.5">3 位 VIP 會員超過 30 天未回購</div>
            </div>
          </div>
          <button className="text-sm text-amber-400 hover:text-amber-300 font-medium transition-colors whitespace-nowrap self-start sm:self-center">
            查看名單 &rarr;
          </button>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {STAT_CARDS.map((s) => (
            <div key={s.label} className="bg-white/[0.03] border border-white/[0.06] rounded-xl px-5 py-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-lg">{s.icon}</span>
                <span className={`text-xs font-medium ${s.changeUp ? 'text-emerald-400' : 'text-red-400'}`}>
                  {s.change}
                </span>
              </div>
              <div className="text-2xl font-bold text-white">{s.value}</div>
              <div className="text-xs text-[#6b6b96] mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Revenue Chart */}
          <div className="lg:col-span-2 bg-white/[0.03] border border-white/[0.06] rounded-xl p-5">
            <div className="text-sm font-semibold text-white mb-1">Last 7 Days Revenue</div>
            <div className="text-xs text-[#6b6b96] mb-5">過去 7 天營收</div>

            <div className="flex items-end gap-2 sm:gap-3 h-44">
              {DAILY_REVENUE.map((d) => {
                const heightPct = (d.amount / maxRevenue) * 100;
                return (
                  <div key={d.day} className="flex-1 flex flex-col items-center gap-2">
                    <div className="text-[10px] text-[#6b6b96]">${(d.amount / 1000).toFixed(1)}k</div>
                    <div className="w-full relative" style={{ height: '120px' }}>
                      <div
                        className="absolute bottom-0 w-full rounded-t-md bg-gradient-to-t from-[#E8654A] to-[#E8654A]/60 transition-all duration-500"
                        style={{ height: `${heightPct}%` }}
                      />
                    </div>
                    <div className="text-xs text-[#6b6b96] font-medium">{d.day}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Top Products */}
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-5">
            <div className="text-sm font-semibold text-white mb-1">Top Products</div>
            <div className="text-xs text-[#6b6b96] mb-4">熱銷商品 Top 5</div>

            <div className="space-y-3">
              {TOP_PRODUCTS.map((p, i) => (
                <div key={p.name} className="flex items-center gap-3">
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    i === 0 ? 'bg-amber-400/20 text-amber-400' : i === 1 ? 'bg-gray-400/20 text-gray-400' : i === 2 ? 'bg-orange-700/20 text-orange-500' : 'bg-white/[0.05] text-[#6b6b96]'
                  }`}>
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-white truncate">{p.name}</div>
                    <div className="text-[10px] text-[#6b6b96]">{p.sales} sold</div>
                  </div>
                  <div className="text-sm font-medium text-white">{p.revenue}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Orders */}
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-5 mb-8">
          <div className="text-sm font-semibold text-white mb-1">Recent Orders</div>
          <div className="text-xs text-[#6b6b96] mb-4">最近訂單</div>

          <div className="space-y-3">
            {RECENT_ORDERS.map((o) => (
              <div key={o.id} className="flex items-center justify-between py-2 border-b border-white/[0.04] last:border-0">
                <div className="flex items-center gap-4">
                  <span className="text-sm font-mono text-[#E8654A]">{o.id}</span>
                  <span className="text-sm text-white/80">{o.customer}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium">{o.total}</span>
                  <span className={`text-xs font-medium ${o.statusColor}`}>{o.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="text-center text-xs text-[#6b6b96]/50 mt-8">
          This is a demo page with mock data &middot; 此為展示頁面，資料為模擬用途
        </div>
      </div>
    </div>
  );
}
