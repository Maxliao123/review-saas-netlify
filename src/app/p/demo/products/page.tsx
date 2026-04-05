'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';

// ─── Types ───

interface Variant {
  name: string;
  sku: string;
  price: number;
  stock: number;
  color: string;
}

interface Product {
  id: number;
  name: string;
  nameZh: string;
  price: number;
  stock: number;
  status: 'active' | 'draft';
  category: string;
  image: string;
  description: string;
  variants: Variant[];
}

// ─── EditableCell ───

function EditableCell({
  value,
  onSave,
  type = 'text',
  isDark,
}: {
  value: string | number;
  onSave: (val: string) => void;
  type?: 'text' | 'number';
  isDark: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) inputRef.current.focus();
  }, [editing]);

  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  const commit = useCallback(() => {
    setEditing(false);
    onSave(draft);
  }, [draft, onSave]);

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === 'Enter' && commit()}
        type={type}
        className={`px-2 py-0.5 rounded text-sm w-full outline-none border ${
          isDark
            ? 'bg-white/10 border-white/20 text-white'
            : 'bg-gray-100 border-gray-300 text-gray-900'
        }`}
        style={{ minWidth: 60, maxWidth: 160 }}
      />
    );
  }

  return (
    <span
      onDoubleClick={() => setEditing(true)}
      className="cursor-text select-none"
      title="Double-click to edit"
    >
      {value}
    </span>
  );
}

// ─── Data ───

const INITIAL_PRODUCTS: Product[] = [
  {
    id: 1,
    name: 'Spring Bouquet DIY Kit',
    nameZh: '春日花束 DIY 套組',
    price: 68,
    stock: 24,
    status: 'active',
    category: 'Kits',
    image: 'https://images.unsplash.com/photo-1490750967868-88aa4f44baee?w=200&h=200&fit=crop&q=80',
    description: 'A complete DIY kit with fresh seasonal flowers, ribbons, and wrapping paper. Perfect for beginners and flower lovers alike.',
    variants: [
      { name: 'Rose Pink', sku: 'SKU-001-PK', price: 68, stock: 8, color: '#f87171' },
      { name: 'Sunset Orange', sku: 'SKU-001-OR', price: 68, stock: 6, color: '#fb923c' },
      { name: 'Golden Yellow', sku: 'SKU-001-YL', price: 68, stock: 5, color: '#fbbf24' },
      { name: 'Spring Green', sku: 'SKU-001-GR', price: 68, stock: 5, color: '#a3e635' },
    ],
  },
  {
    id: 2,
    name: 'Gel Nail Art Starter Set',
    nameZh: '光療美甲入門組',
    price: 45,
    stock: 18,
    status: 'active',
    category: 'Kits',
    image: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=200&h=200&fit=crop&q=80',
    description: 'Everything you need to start gel nail art at home. Includes UV lamp, base coat, top coat, and 6 popular gel colors.',
    variants: [
      { name: 'Blush Pink', sku: 'SKU-002-PK', price: 45, stock: 8, color: '#f472b6' },
      { name: 'Lavender', sku: 'SKU-002-LV', price: 45, stock: 5, color: '#c084fc' },
      { name: 'Ocean Blue', sku: 'SKU-002-BL', price: 45, stock: 5, color: '#60a5fa' },
    ],
  },
  {
    id: 3,
    name: 'Dried Flower Frame Kit',
    nameZh: '乾燥花相框組',
    price: 55,
    stock: 32,
    status: 'active',
    category: 'Kits',
    image: 'https://images.unsplash.com/photo-1487530811176-3780de880c2d?w=200&h=200&fit=crop&q=80',
    description: 'Create stunning preserved flower art with this elegant frame kit. Includes dried flowers, frame, and adhesive.',
    variants: [
      { name: 'Golden Yellow', sku: 'SKU-003-YL', price: 55, stock: 12, color: '#fbbf24' },
      { name: 'Pastel Pink', sku: 'SKU-003-PK', price: 55, stock: 10, color: '#f9a8d4' },
      { name: 'Mint Green', sku: 'SKU-003-GR', price: 55, stock: 10, color: '#86efac' },
    ],
  },
  {
    id: 4,
    name: 'Premium Floral Scissors',
    nameZh: '專業花藝剪刀',
    price: 28,
    stock: 45,
    status: 'active',
    category: 'Tools',
    image: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=200&h=200&fit=crop&q=80',
    description: 'Japanese stainless steel floral scissors with ergonomic grip. Sharp, precise, and built to last.',
    variants: [
      { name: 'Silver', sku: 'SKU-004-SL', price: 28, stock: 30, color: '#94a3b8' },
      { name: 'Gold', sku: 'SKU-004-GD', price: 32, stock: 15, color: '#fbbf24' },
    ],
  },
  {
    id: 5,
    name: 'Nail Drill Machine Pro',
    nameZh: '專業電動磨甲機',
    price: 120,
    stock: 8,
    status: 'active',
    category: 'Tools',
    image: 'https://images.unsplash.com/photo-1519014816548-bf5fe059798b?w=200&h=200&fit=crop&q=80',
    description: 'Professional-grade electric nail drill with adjustable speed, 6 interchangeable bits, and low-vibration motor.',
    variants: [
      { name: 'White', sku: 'SKU-005-WH', price: 120, stock: 5, color: '#e2e8f0' },
      { name: 'Pink', sku: 'SKU-005-PK', price: 120, stock: 3, color: '#f472b6' },
    ],
  },
  {
    id: 6,
    name: 'Floral Foam Blocks (10pk)',
    nameZh: '花泥磚 10 入',
    price: 15,
    stock: 120,
    status: 'active',
    category: 'Supplies',
    image: 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=200&h=200&fit=crop&q=80',
    description: 'Premium wet floral foam blocks for fresh flower arrangements. Easy to cut, excellent water absorption.',
    variants: [
      { name: 'Green', sku: 'SKU-006-GR', price: 15, stock: 120, color: '#4ade80' },
    ],
  },
  {
    id: 7,
    name: 'Holiday Wreath Workshop Kit',
    nameZh: '節日花圈工作坊組',
    price: 88,
    stock: 0,
    status: 'draft',
    category: 'Kits',
    image: 'https://images.unsplash.com/photo-1490750967868-88aa4f44baee?w=100&h=100&fit=crop',
    description: 'Complete workshop kit for making festive holiday wreaths. Includes wire frame, greenery, ornaments, and ribbon.',
    variants: [
      { name: 'Classic Red', sku: 'SKU-007-RD', price: 88, stock: 0, color: '#ef4444' },
      { name: 'Emerald Green', sku: 'SKU-007-GR', price: 88, stock: 0, color: '#22c55e' },
      { name: 'Golden', sku: 'SKU-007-GD', price: 88, stock: 0, color: '#fbbf24' },
    ],
  },
  {
    id: 8,
    name: 'Chrome Nail Powder Set',
    nameZh: '鏡面甲粉套組',
    price: 35,
    stock: 0,
    status: 'draft',
    category: 'Supplies',
    image: 'https://images.unsplash.com/photo-1585128792020-803d29415281?w=200&h=200&fit=crop&q=80',
    description: 'Mirror-finish chrome nail powders in 3 stunning shades. Create eye-catching metallic nails in seconds.',
    variants: [
      { name: 'Silver Chrome', sku: 'SKU-008-SL', price: 35, stock: 0, color: '#c0c0c0' },
      { name: 'Gold Chrome', sku: 'SKU-008-GD', price: 35, stock: 0, color: '#ffd700' },
      { name: 'Rose Gold', sku: 'SKU-008-RG', price: 35, stock: 0, color: '#e5a1aa' },
    ],
  },
];

type TabKey = 'all' | 'active' | 'draft';

export default function DemoProductsPage() {
  const [tab, setTab] = useState<TabKey>('all');
  const [search, setSearch] = useState('');
  const [isDark, setIsDark] = useState(true);
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [expandedVariant, setExpandedVariant] = useState<number | null>(null);
  const [detailProduct, setDetailProduct] = useState<Product | null>(null);
  const [selectedVariantIdx, setSelectedVariantIdx] = useState(0);

  const filtered = products.filter((p) => {
    if (tab === 'active' && p.status !== 'active') return false;
    if (tab === 'draft' && p.status !== 'draft') return false;
    if (search) {
      const q = search.toLowerCase();
      return p.name.toLowerCase().includes(q) || p.nameZh.includes(q);
    }
    return true;
  });

  const tabs: { key: TabKey; label: string; count: number }[] = [
    { key: 'all', label: 'All', count: products.length },
    { key: 'active', label: 'Active', count: products.filter((p) => p.status === 'active').length },
    { key: 'draft', label: 'Draft', count: products.filter((p) => p.status === 'draft').length },
  ];

  // ─── Update helpers ───

  function updateProduct(id: number, field: keyof Product, value: string) {
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        if (field === 'price' || field === 'stock') return { ...p, [field]: Number(value) || 0 };
        return { ...p, [field]: value };
      })
    );
  }

  function updateVariant(productId: number, variantIdx: number, field: keyof Variant, value: string) {
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id !== productId) return p;
        const newVariants = [...p.variants];
        if (field === 'price' || field === 'stock') {
          newVariants[variantIdx] = { ...newVariants[variantIdx], [field]: Number(value) || 0 };
        } else {
          newVariants[variantIdx] = { ...newVariants[variantIdx], [field]: value };
        }
        return { ...p, variants: newVariants };
      })
    );
  }

  // ─── Theme classes ───

  const bg = isDark ? 'bg-[#07070d]' : 'bg-white';
  const text = isDark ? 'text-[#ededf5]' : 'text-gray-900';
  const textMuted = isDark ? 'text-[#6b6b96]' : 'text-gray-500';
  const border = isDark ? 'border-white/[0.07]' : 'border-gray-200';
  const borderLight = isDark ? 'border-white/[0.06]' : 'border-gray-100';
  const cardBg = isDark ? 'bg-white/[0.02]' : 'bg-gray-50';
  const inputBg = isDark
    ? 'bg-white/[0.04] border-white/[0.08] text-white placeholder-[#6b6b96]'
    : 'bg-gray-100 border-gray-200 text-gray-900 placeholder-gray-400';
  const tabActiveBg = isDark ? 'bg-white/[0.08] text-white' : 'bg-gray-200 text-gray-900';
  const tabInactive = isDark ? 'text-[#6b6b96] hover:text-white' : 'text-gray-400 hover:text-gray-900';
  const hoverRow = isDark ? 'hover:bg-white/[0.02]' : 'hover:bg-gray-100/60';
  const variantBg = isDark ? 'bg-[#0d0d18]' : 'bg-gray-100';

  return (
    <div className={`min-h-screen ${bg} ${text} transition-colors duration-200`}>
      {/* Top bar */}
      <div className={`flex items-center justify-between px-4 sm:px-8 py-4 border-b ${border}`}>
        <Link href="/p/demo/admin" className={`text-sm ${textMuted} hover:${isDark ? 'text-white' : 'text-gray-900'} transition-colors`}>
          &larr; Back
        </Link>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsDark(!isDark)}
            className={`text-xs px-3 py-1.5 rounded-full font-medium border transition-colors ${
              isDark
                ? 'bg-white/10 border-white/20 text-white hover:bg-white/20'
                : 'bg-gray-200 border-gray-300 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {isDark ? 'Light Mode' : 'Dark Mode'}
          </button>
          <span className="text-[11px] text-[#6b6b96] bg-[#E8654A]/10 border border-[#E8654A]/30 px-3 py-1 rounded-full font-medium tracking-wide">
            DEMO &middot; 展示用
          </span>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold">商品管理 &middot; Product Management</h1>
            <p className={`text-sm ${textMuted} mt-1`}>Lush Nail Studio</p>
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
            className={`${inputBg} border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#E8654A]/50 w-full sm:w-72`}
          />
          <div className={`flex gap-1 ${isDark ? 'bg-white/[0.03]' : 'bg-gray-100'} rounded-lg p-1`}>
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  tab === t.key ? tabActiveBg : tabInactive
                }`}
              >
                {t.label} <span className="text-xs opacity-60">({t.count})</span>
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className={`${cardBg} border ${borderLight} rounded-xl overflow-hidden`}>
          {/* Desktop header */}
          <div className={`hidden sm:grid grid-cols-[56px_2fr_100px_80px_120px_80px] gap-4 px-6 py-3 border-b ${borderLight} text-xs ${textMuted} uppercase tracking-wider font-medium`}>
            <span>Image</span>
            <span>Product</span>
            <span>Price</span>
            <span>Stock</span>
            <span>Variants</span>
            <span>Status</span>
          </div>

          {filtered.map((p) => (
            <div key={p.id}>
              <div
                className={`grid grid-cols-1 sm:grid-cols-[56px_2fr_100px_80px_120px_80px] gap-2 sm:gap-4 px-4 sm:px-6 py-4 border-b ${isDark ? 'border-white/[0.04]' : 'border-gray-100'} ${hoverRow} transition-colors items-center`}
              >
                {/* Image */}
                <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 relative">
                  <Image
                    src={p.image}
                    alt={p.name}
                    width={48}
                    height={48}
                    className="w-full h-full object-cover"
                    unoptimized
                  />
                </div>

                {/* Name */}
                <div>
                  <div
                    className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'} cursor-pointer hover:text-[#E8654A] transition-colors`}
                    onClick={() => { setDetailProduct(p); setSelectedVariantIdx(0); }}
                  >
                    <EditableCell
                      value={p.name}
                      onSave={(v) => updateProduct(p.id, 'name', v)}
                      isDark={isDark}
                    />
                  </div>
                  <div className={`text-xs ${textMuted} mt-0.5`}>{p.nameZh}</div>
                </div>

                {/* Price */}
                <div className="text-sm font-medium">
                  $<EditableCell
                    value={p.price.toFixed(2)}
                    onSave={(v) => updateProduct(p.id, 'price', v)}
                    type="number"
                    isDark={isDark}
                  />
                </div>

                {/* Stock */}
                <div className={`text-sm ${p.stock === 0 ? 'text-red-400' : p.stock < 10 ? 'text-amber-400' : textMuted}`}>
                  <EditableCell
                    value={p.stock}
                    onSave={(v) => updateProduct(p.id, 'stock', v)}
                    type="number"
                    isDark={isDark}
                  />
                </div>

                {/* Color variants */}
                <div className="flex gap-1.5">
                  {p.variants.map((v, i) => (
                    <button
                      key={i}
                      className={`w-5 h-5 rounded-full border transition-transform hover:scale-125 ${
                        isDark ? 'border-white/10' : 'border-gray-300'
                      } ${expandedVariant === p.id ? 'ring-2 ring-[#E8654A]/50' : ''}`}
                      style={{ backgroundColor: v.color }}
                      onClick={() => setExpandedVariant(expandedVariant === p.id ? null : p.id)}
                      title={`Click to ${expandedVariant === p.id ? 'collapse' : 'expand'} variants`}
                    />
                  ))}
                </div>

                {/* Status */}
                <span
                  className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium w-fit ${
                    p.status === 'active'
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : isDark
                      ? 'bg-white/[0.05] text-[#6b6b96] border border-white/[0.08]'
                      : 'bg-gray-200 text-gray-500 border border-gray-300'
                  }`}
                >
                  {p.status === 'active' ? 'Active' : 'Draft'}
                </span>
              </div>

              {/* Expanded variants row */}
              {expandedVariant === p.id && (
                <div className={`${variantBg} px-4 sm:px-6 py-4 border-b ${isDark ? 'border-white/[0.04]' : 'border-gray-100'}`}>
                  <div className={`text-xs font-semibold ${textMuted} uppercase tracking-wider mb-3`}>
                    Variants ({p.variants.length})
                  </div>
                  <div className="space-y-2">
                    {p.variants.map((v, vi) => (
                      <div
                        key={vi}
                        className={`flex flex-wrap items-center gap-4 px-4 py-3 rounded-lg ${
                          isDark ? 'bg-white/[0.03]' : 'bg-white'
                        } border ${isDark ? 'border-white/[0.06]' : 'border-gray-200'}`}
                      >
                        <span
                          className={`w-4 h-4 rounded-full flex-shrink-0 border ${isDark ? 'border-white/20' : 'border-gray-300'}`}
                          style={{ backgroundColor: v.color }}
                        />
                        <div className="min-w-[120px]">
                          <div className={`text-xs ${textMuted}`}>Name</div>
                          <div className="text-sm font-medium">
                            <EditableCell value={v.name} onSave={(val) => updateVariant(p.id, vi, 'name', val)} isDark={isDark} />
                          </div>
                        </div>
                        <div className="min-w-[100px]">
                          <div className={`text-xs ${textMuted}`}>SKU</div>
                          <div className={`text-sm font-mono ${textMuted}`}>
                            <EditableCell value={v.sku} onSave={(val) => updateVariant(p.id, vi, 'sku', val)} isDark={isDark} />
                          </div>
                        </div>
                        <div className="min-w-[70px]">
                          <div className={`text-xs ${textMuted}`}>Price</div>
                          <div className="text-sm font-medium">
                            $<EditableCell value={v.price.toFixed(2)} onSave={(val) => updateVariant(p.id, vi, 'price', val)} type="number" isDark={isDark} />
                          </div>
                        </div>
                        <div className="min-w-[60px]">
                          <div className={`text-xs ${textMuted}`}>Stock</div>
                          <div className={`text-sm ${v.stock === 0 ? 'text-red-400' : v.stock < 10 ? 'text-amber-400' : ''}`}>
                            <EditableCell value={v.stock} onSave={(val) => updateVariant(p.id, vi, 'stock', val)} type="number" isDark={isDark} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}

          {filtered.length === 0 && (
            <div className={`px-6 py-12 text-center ${textMuted} text-sm`}>No products found.</div>
          )}
        </div>

        <div className={`text-center text-xs mt-8 ${isDark ? 'text-[#6b6b96]/50' : 'text-gray-400'}`}>
          This is a demo page with mock data &middot; 此為展示頁面，資料為模擬用途
        </div>
      </div>

      {/* ─── Product Detail Modal ─── */}
      {detailProduct && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={() => setDetailProduct(null)}
        >
          {/* Backdrop */}
          <div className={`absolute inset-0 ${isDark ? 'bg-black/70' : 'bg-black/40'} backdrop-blur-sm`} />

          {/* Modal */}
          <div
            className={`relative w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden ${
              isDark ? 'bg-[#0f0f1a] border-white/10' : 'bg-white border-gray-200'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => setDetailProduct(null)}
              className={`absolute top-4 right-4 z-10 w-8 h-8 rounded-full flex items-center justify-center text-lg ${
                isDark ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-600'
              }`}
            >
              x
            </button>

            {/* Large product image */}
            <div className="relative w-full h-64 overflow-hidden">
              <Image
                src={detailProduct.image.replace('w=100&h=100', 'w=600&h=400')}
                alt={detailProduct.name}
                fill
                className="object-cover"
                unoptimized
              />
            </div>

            {/* Content */}
            <div className="p-6">
              <h2 className="text-xl font-bold mb-1">{detailProduct.name}</h2>
              <p className={`text-sm ${textMuted} mb-4`}>{detailProduct.nameZh}</p>
              <p className={`text-sm ${isDark ? 'text-[#9898b8]' : 'text-gray-600'} mb-6 leading-relaxed`}>
                {detailProduct.description}
              </p>

              <div className="flex items-center justify-between mb-4">
                <div className="text-2xl font-bold text-[#E8654A]">
                  ${detailProduct.variants[selectedVariantIdx]?.price.toFixed(2) ?? detailProduct.price.toFixed(2)}
                </div>
                <div className={`text-sm ${textMuted}`}>
                  {detailProduct.variants[selectedVariantIdx]?.stock ?? detailProduct.stock} in stock
                </div>
              </div>

              {/* Variant selector */}
              {detailProduct.variants.length > 1 && (
                <div className="mb-6">
                  <div className={`text-xs font-semibold ${textMuted} uppercase tracking-wider mb-2`}>
                    Select variant
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {detailProduct.variants.map((v, i) => (
                      <button
                        key={i}
                        onClick={() => setSelectedVariantIdx(i)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors ${
                          selectedVariantIdx === i
                            ? 'border-[#E8654A] bg-[#E8654A]/10 text-[#E8654A]'
                            : isDark
                            ? 'border-white/10 hover:border-white/20'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: v.color }} />
                        {v.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Add to Cart */}
              <button className="w-full py-3 bg-[#E8654A] text-white rounded-xl text-sm font-bold hover:bg-[#d4563d] transition-colors">
                Add to Cart
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
