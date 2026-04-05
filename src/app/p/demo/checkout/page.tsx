'use client';

import { useState } from 'react';
import Link from 'next/link';

const CART_ITEMS = [
  { id: 1, name: 'Spring Bouquet DIY Kit', nameZh: '春日花束 DIY 套組', price: 68, qty: 1, variant: 'Pink & Peach' },
  { id: 2, name: 'Premium Floral Scissors', nameZh: '專業花藝剪刀', price: 28, qty: 2, variant: 'Gold' },
];

export default function DemoCheckoutPage() {
  const [coupon, setCoupon] = useState('');
  const [usePoints, setUsePoints] = useState(false);

  const subtotal = CART_ITEMS.reduce((sum, item) => sum + item.price * item.qty, 0);
  const pointsDiscount = usePoints ? 1.0 : 0;
  const afterPoints = subtotal - pointsDiscount;
  const gst = afterPoints * 0.05;
  const pst = afterPoints * 0.07;
  const total = afterPoints + gst + pst;

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

      <div className="max-w-lg mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-2xl font-bold">Lush Nail Studio</div>
          <div className="text-sm text-[#6b6b96] mt-1">Checkout</div>
        </div>

        {/* Cart Items */}
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-5 mb-5">
          <div className="text-xs text-[#6b6b96] uppercase tracking-wider font-medium mb-4">Your Cart</div>
          {CART_ITEMS.map((item) => (
            <div key={item.id} className="flex justify-between items-start py-3 border-b border-white/[0.04] last:border-0">
              <div className="flex gap-3">
                <div className="w-12 h-12 rounded-lg bg-white/[0.06] flex items-center justify-center text-lg shrink-0">
                  {item.id === 1 ? '💐' : '✂️'}
                </div>
                <div>
                  <div className="text-sm font-medium">{item.name}</div>
                  <div className="text-xs text-[#6b6b96] mt-0.5">{item.variant} &middot; Qty: {item.qty}</div>
                </div>
              </div>
              <div className="text-sm font-semibold">${(item.price * item.qty).toFixed(2)}</div>
            </div>
          ))}
        </div>

        {/* Coupon */}
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-5 mb-5">
          <div className="text-xs text-[#6b6b96] uppercase tracking-wider font-medium mb-3">Coupon Code</div>
          <div className="flex gap-2">
            <input
              type="text"
              value={coupon}
              onChange={(e) => setCoupon(e.target.value)}
              placeholder="Enter code..."
              className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-lg px-4 py-2.5 text-sm text-white placeholder-[#6b6b96] focus:outline-none focus:border-[#E8654A]/50"
            />
            <button className="px-5 py-2.5 bg-white/[0.06] border border-white/[0.1] rounded-lg text-sm font-medium hover:bg-white/[0.1] transition-colors">
              Apply
            </button>
          </div>
        </div>

        {/* Points */}
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-5 mb-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">Use 100 Points</div>
              <div className="text-xs text-[#6b6b96] mt-0.5">Save $1.00 on this order</div>
            </div>
            <button
              onClick={() => setUsePoints(!usePoints)}
              className={`w-12 h-7 rounded-full relative transition-colors ${usePoints ? 'bg-[#E8654A]' : 'bg-white/[0.1]'}`}
            >
              <span
                className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-transform ${usePoints ? 'left-6' : 'left-1'}`}
              />
            </button>
          </div>
        </div>

        {/* Summary */}
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-5 mb-5">
          <div className="text-xs text-[#6b6b96] uppercase tracking-wider font-medium mb-4">Order Summary</div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-[#6b6b96]">Subtotal</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            {usePoints && (
              <div className="flex justify-between text-emerald-400">
                <span>Points Redemption</span>
                <span>-$1.00</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-[#6b6b96]">GST (5%)</span>
              <span>${gst.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#6b6b96]">PST (7%)</span>
              <span>${pst.toFixed(2)}</span>
            </div>
            <div className="flex justify-between pt-3 border-t border-white/[0.06] text-base font-bold">
              <span>Total</span>
              <span>${total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Payment Methods */}
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-5 mb-5">
          <div className="text-xs text-[#6b6b96] uppercase tracking-wider font-medium mb-4">Payment</div>

          {/* Apple Pay / Google Pay */}
          <div className="grid grid-cols-2 gap-3 mb-5">
            <button className="py-3 bg-white rounded-lg text-black text-sm font-semibold flex items-center justify-center gap-2">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/></svg>
               Pay
            </button>
            <button className="py-3 bg-white rounded-lg text-black text-sm font-semibold flex items-center justify-center gap-2">
              <svg className="w-5 h-5" viewBox="0 0 24 24"><path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z" fill="#4285F4"/></svg>
               Pay
            </button>
          </div>

          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px bg-white/[0.08]" />
            <span className="text-xs text-[#6b6b96]">or pay with card</span>
            <div className="flex-1 h-px bg-white/[0.08]" />
          </div>

          {/* Stripe-like card form */}
          <div className="space-y-3">
            <div>
              <label className="text-xs text-[#6b6b96] mb-1.5 block">Card Number</label>
              <div className="bg-white/[0.04] border border-white/[0.08] rounded-lg px-4 py-3 text-sm text-[#6b6b96] flex items-center justify-between">
                <span>4242 4242 4242 4242</span>
                <div className="flex gap-1">
                  <div className="w-8 h-5 bg-[#1a1f71] rounded text-[8px] text-white flex items-center justify-center font-bold">VISA</div>
                  <div className="w-8 h-5 bg-[#eb001b]/80 rounded text-[8px] text-white flex items-center justify-center font-bold">MC</div>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-[#6b6b96] mb-1.5 block">Expiry</label>
                <div className="bg-white/[0.04] border border-white/[0.08] rounded-lg px-4 py-3 text-sm text-[#6b6b96]">
                  12 / 28
                </div>
              </div>
              <div>
                <label className="text-xs text-[#6b6b96] mb-1.5 block">CVC</label>
                <div className="bg-white/[0.04] border border-white/[0.08] rounded-lg px-4 py-3 text-sm text-[#6b6b96]">
                  &bull;&bull;&bull;
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Pay button */}
        <button className="w-full py-4 bg-[#E8654A] text-white rounded-xl text-base font-bold hover:bg-[#d4563d] transition-colors">
          Pay ${total.toFixed(2)}
        </button>

        <div className="flex items-center justify-center gap-2 mt-4 text-xs text-[#6b6b96]">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
          Secured by Stripe
        </div>

        <div className="text-center text-xs text-[#6b6b96]/50 mt-8">
          This is a demo page with mock data &middot; 此為展示頁面，資料為模擬用途
        </div>
      </div>
    </div>
  );
}
