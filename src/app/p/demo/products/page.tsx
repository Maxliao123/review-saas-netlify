'use client';

import { useState } from 'react';
import Link from 'next/link';

const PRODUCTS = [
  { id: 1, name: 'Spring Bouquet DIY Kit', nameZh: '春日花束 DIY 套組', price: 68, stock: 24, status: 'active' as const, colors: ['#f87171', '#fb923c', '#fbbf24', '#a3e635'], category: 'Kits' },
  { id: 2, name: 'Gel Nail Art Starter Set', nameZh: '光療美甲入門組', price: 45, stock: 18, status: 'active' as const, colors: ['#f472b6', '#c084fc', '#60a5fa'], category: 'Kits' },
  { id: 3, name: 'Dried Flower Frame Kit', nameZh: '乾燥花相框組', price: 55, stock: 32, status: 'active' as const, colors: ['#fbbf24', '#f9a8d4', '#86efac'], category: 'Kits' },
  { id: 4, name: 'Premium Floral Scissors', nameZh: '專業花藝剪刀', price: 28, stock: 45, status: 'active' as const, colors: ['#94a3b8', '#fbbf24'], category: 'Tools' },
  { id: 5, name: 'Nail Drill Machine Pro', nameZh: '專業電動磨甲機', price: 120, stock: 8, status: 'active' as const, colors: ['#e2e8f0', '#f472b6'], category: 'Tools' },
  { id: 6, name: 'Floral Foam Blocks (10pk)', nameZh: '花泥磚 10 入', price: 15, stock: 120, status: 'active' as const, colors: ['#4ade80'], category: 'Supplies' },
  { id: 7, name: 'Holiday Wreath Workshop Kit', nameZh: '節日花圈工作坊組', price: 88, stock: 0, status: 'draft' as const, colors: ['#ef4444', '#22c55e', '#fbbf24'], category: 'Kits' },
  { id: 8, name: 'Chrome Nail Powder Set', nameZh: '鏡面甲粉套組', price: 35, stock: 0, status: 'draft' as const, colors: ['#c0c0c0', '#ffd700', '#e5a1aa'], category: 'Supplies' },
];

type TabKey = 'all' | 'active' | 'draft';

export default function DemoProductsPage() {
  const [tab, setTab] = useState<TabKey>('all');
  const [search, setSearch] = useState('');

  const filtered = PRODUCTS.filter((p) => {
    if (tab === 'active' && p.status !== 'active') return false;
    if (tab === 'draft' && p.status !== 'draft') return false;
    if (search) {
      const q = search.toLowerCase();
      return p.name.toLowerCase().includes(q) || p.nameZh.includes(q);
    }
    return true;
  });

  const tabs: { key: TabKey; label: string; count: number }[] = [
    { key: 'all', label: 'All', count: PRODUCTS.length },
    { key: 'active', label: 'Active', count: PRODUCTS.filter((p) => p.status === 'active').length },
    { key: 'draft', label: 'Draft', count: PRODUCTS.filter((p) => p.status === 'draft').length },
  ];

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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold">商品管理 &middot; Product Management</h1>
            <p className="text-sm text-[#6b6b96] mt-1">Lush Nail Studio</p>
          </div>
          <button className="px-5 py-2.5 bg-[#E8654A] text-white rounded-lg text-sm font-semibold hover:bg-[#d4563d] transition-colors self-start">
            + Add Product
          </button>
        </div>

        {/* Search + Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
          <input
            type="text"
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-white/[0.04] border border-white/[0.08] rounded-lg px-4 py-2.5 text-sm text-white placeholder-[#6b6b96] focus:outline-none focus:border-[#E8654A]/50 w-full sm:w-72"
          />
          <div className="flex gap-1 bg-white/[0.03] rounded-lg p-1">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  tab === t.key ? 'bg-white/[0.08] text-white' : 'text-[#6b6b96] hover:text-white'
                }`}
              >
                {t.label} <span className="text-xs opacity-60">({t.count})</span>
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl overflow-hidden">
          {/* Desktop header */}
          <div className="hidden sm:grid grid-cols-[1fr_2fr_100px_80px_100px_80px] gap-4 px-6 py-3 border-b border-white/[0.06] text-xs text-[#6b6b96] uppercase tracking-wider font-medium">
            <span>Image</span>
            <span>Product</span>
            <span>Price</span>
            <span>Stock</span>
            <span>Variants</span>
            <span>Status</span>
          </div>

          {filtered.map((p) => (
            <div
              key={p.id}
              className="grid grid-cols-1 sm:grid-cols-[1fr_2fr_100px_80px_100px_80px] gap-2 sm:gap-4 px-4 sm:px-6 py-4 border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors items-center"
            >
              {/* Image placeholder */}
              <div className="w-12 h-12 rounded-lg bg-white/[0.06] flex items-center justify-center text-lg">
                {p.category === 'Kits' ? '🎁' : p.category === 'Tools' ? '✂️' : '📦'}
              </div>

              {/* Name */}
              <div>
                <div className="text-sm font-medium text-white">{p.name}</div>
                <div className="text-xs text-[#6b6b96] mt-0.5">{p.nameZh}</div>
              </div>

              {/* Price */}
              <div className="text-sm font-medium">${p.price.toFixed(2)}</div>

              {/* Stock */}
              <div className={`text-sm ${p.stock === 0 ? 'text-red-400' : p.stock < 10 ? 'text-amber-400' : 'text-[#6b6b96]'}`}>
                {p.stock === 0 ? 'Out' : p.stock}
              </div>

              {/* Color variants */}
              <div className="flex gap-1.5">
                {p.colors.map((c, i) => (
                  <span key={i} className="w-5 h-5 rounded-full border border-white/10" style={{ backgroundColor: c }} />
                ))}
              </div>

              {/* Status */}
              <span
                className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium w-fit ${
                  p.status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-white/[0.05] text-[#6b6b96] border border-white/[0.08]'
                }`}
              >
                {p.status === 'active' ? 'Active' : 'Draft'}
              </span>
            </div>
          ))}

          {filtered.length === 0 && (
            <div className="px-6 py-12 text-center text-[#6b6b96] text-sm">No products found.</div>
          )}
        </div>

        <div className="text-center text-xs text-[#6b6b96]/50 mt-8">
          This is a demo page with mock data &middot; 此為展示頁面，資料為模擬用途
        </div>
      </div>
    </div>
  );
}
