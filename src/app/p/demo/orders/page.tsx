'use client';

import { useState } from 'react';
import Link from 'next/link';

const STATS = [
  { label: "Today's Revenue", value: '$1,280', icon: '💰' },
  { label: 'Orders', value: '8', icon: '📦' },
  { label: 'New Members', value: '3', icon: '👤' },
];

type OrderStatus = 'paid' | 'shipped' | 'delivered' | 'refunded';

interface OrderItem {
  name: string;
  qty: number;
  price: number;
}

interface Order {
  id: string;
  customer: string;
  date: string;
  items: OrderItem[];
  total: number;
  status: OrderStatus;
}

const ORDERS: Order[] = [
  {
    id: 'BS-2026-0412',
    customer: 'Emily Chen',
    date: '2026-04-04',
    items: [
      { name: 'Spring Bouquet DIY Kit', qty: 1, price: 68 },
      { name: 'Floral Foam Blocks (10pk)', qty: 2, price: 30 },
    ],
    total: 98,
    status: 'paid',
  },
  {
    id: 'BS-2026-0411',
    customer: 'Jessica Wang',
    date: '2026-04-03',
    items: [
      { name: 'Gel Nail Art Starter Set', qty: 1, price: 45 },
      { name: 'Chrome Nail Powder Set', qty: 1, price: 35 },
    ],
    total: 80,
    status: 'shipped',
  },
  {
    id: 'BS-2026-0410',
    customer: 'Sarah Liu',
    date: '2026-04-03',
    items: [{ name: 'Nail Drill Machine Pro', qty: 1, price: 120 }],
    total: 120,
    status: 'shipped',
  },
  {
    id: 'BS-2026-0409',
    customer: 'Amy Zhang',
    date: '2026-04-02',
    items: [
      { name: 'Dried Flower Frame Kit', qty: 2, price: 110 },
      { name: 'Premium Floral Scissors', qty: 1, price: 28 },
    ],
    total: 138,
    status: 'delivered',
  },
  {
    id: 'BS-2026-0408',
    customer: 'Michelle Huang',
    date: '2026-04-01',
    items: [{ name: 'Spring Bouquet DIY Kit', qty: 3, price: 204 }],
    total: 204,
    status: 'delivered',
  },
  {
    id: 'BS-2026-0407',
    customer: 'Linda Wu',
    date: '2026-03-30',
    items: [{ name: 'Holiday Wreath Workshop Kit', qty: 1, price: 88 }],
    total: 88,
    status: 'refunded',
  },
];

const STATUS_STYLES: Record<OrderStatus, string> = {
  paid: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  shipped: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  delivered: 'bg-white/[0.05] text-[#6b6b96] border-white/[0.08]',
  refunded: 'bg-red-500/10 text-red-400 border-red-500/20',
};

const STATUS_LABELS: Record<OrderStatus, string> = {
  paid: 'Paid',
  shipped: 'Shipped',
  delivered: 'Delivered',
  refunded: 'Refunded',
};

export default function DemoOrdersPage() {
  const [expandedId, setExpandedId] = useState<string | null>(null);

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
          <h1 className="text-2xl font-bold">訂單管理 &middot; Order Management</h1>
          <p className="text-sm text-[#6b6b96] mt-1">Lush Nail Studio</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {STATS.map((s) => (
            <div key={s.label} className="bg-white/[0.03] border border-white/[0.06] rounded-xl px-5 py-4 flex items-center gap-4">
              <span className="text-2xl">{s.icon}</span>
              <div>
                <div className="text-xs text-[#6b6b96] font-medium">{s.label}</div>
                <div className="text-xl font-bold text-white mt-0.5">{s.value}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Orders table */}
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl overflow-hidden">
          {/* Header */}
          <div className="hidden sm:grid grid-cols-[140px_1fr_100px_80px_100px_100px] gap-4 px-6 py-3 border-b border-white/[0.06] text-xs text-[#6b6b96] uppercase tracking-wider font-medium">
            <span>Order #</span>
            <span>Customer</span>
            <span>Date</span>
            <span>Items</span>
            <span>Total</span>
            <span>Status</span>
          </div>

          {ORDERS.map((o) => (
            <div key={o.id}>
              <div
                className="grid grid-cols-1 sm:grid-cols-[140px_1fr_100px_80px_100px_100px] gap-2 sm:gap-4 px-4 sm:px-6 py-4 border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors items-center cursor-pointer"
                onClick={() => setExpandedId(expandedId === o.id ? null : o.id)}
              >
                <div className="text-sm font-mono text-[#E8654A]">{o.id}</div>
                <div className="text-sm font-medium">{o.customer}</div>
                <div className="text-sm text-[#6b6b96]">{o.date}</div>
                <div className="text-sm text-[#6b6b96]">{o.items.length}</div>
                <div className="text-sm font-semibold">${o.total.toFixed(2)}</div>
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border w-fit ${STATUS_STYLES[o.status]}`}>
                  {STATUS_LABELS[o.status]}
                </span>
              </div>

              {/* Expanded line items */}
              {expandedId === o.id && (
                <div className="bg-white/[0.01] border-b border-white/[0.04] px-6 sm:px-12 py-4">
                  <div className="text-xs text-[#6b6b96] uppercase tracking-wider mb-3 font-medium">Line Items</div>
                  {o.items.map((item, i) => (
                    <div key={i} className="flex justify-between items-center py-2 border-b border-white/[0.03] last:border-0">
                      <div className="text-sm text-white/80">{item.name}</div>
                      <div className="text-sm text-[#6b6b96]">
                        x{item.qty} &middot; ${item.price.toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="text-center text-xs text-[#6b6b96]/50 mt-8">
          This is a demo page with mock data &middot; 此為展示頁面，資料為模擬用途
        </div>
      </div>
    </div>
  );
}
