'use client';

import { useState } from 'react';
import Link from 'next/link';

const DEMO_TOKEN = '3fd7ed1f3595a5b4cb8274fe0ac2d4a5';

type Tab = 'today' | 'members' | 'verify' | 'bookings' | 'packages' | 'services' | 'coupons' | 'points' | 'reviews' | 'sms' | 'revenue' | 'performance';

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'today', label: 'Today', icon: '📋' },
  { id: 'members', label: 'Members', icon: '👥' },
  { id: 'verify', label: 'Check-in', icon: '✅' },
  { id: 'bookings', label: 'Bookings', icon: '📅' },
  { id: 'packages', label: 'Packages', icon: '🎫' },
  { id: 'services', label: 'Services', icon: '✂️' },
  { id: 'coupons', label: 'Coupons', icon: '🎁' },
  { id: 'points', label: 'Points', icon: '⭐' },
  { id: 'reviews', label: 'Reviews', icon: '💬' },
  { id: 'sms', label: 'SMS Log', icon: '📱' },
  { id: 'revenue', label: 'Revenue', icon: '💰' },
  { id: 'performance', label: 'Stats', icon: '📊' },
];

// ─── Fake Data ───

const MEMBERS = [
  { name: 'Anna Park', phone: '+1 604-555-0105', status: 'active', tags: ['VIP'], vip: 'Gold', visits: 18, points: 520, package: 'Gel Nails 10-Pack', remaining: 2, lastVisit: '1 day ago', birthday: 'Jun 15', email: 'anna@example.com', totalSpent: 2340 },
  { name: 'Mary Johnson', phone: '+1 604-555-0101', status: 'active', tags: [], vip: 'Silver', visits: 12, points: 350, package: 'Gel Nails 10-Pack', remaining: 7, lastVisit: '3 days ago', birthday: 'Nov 22', email: 'mary@example.com', totalSpent: 1580 },
  { name: '王小美', phone: '+1 604-555-0102', status: 'active', tags: [], vip: 'Regular', visits: 7, points: 180, package: 'Gel Nails 5-Pack', remaining: 3, lastVisit: '10 days ago', birthday: 'Mar 8', email: 'xiaomei@example.com', totalSpent: 680 },
  { name: 'Emily Zhang', phone: '+1 604-555-0103', status: 'active', tags: ['dormant_30d'], vip: 'Regular', visits: 3, points: 50, package: '—', remaining: 0, lastVisit: '45 days ago', birthday: 'Sep 3', email: 'emily@example.com', totalSpent: 195 },
  { name: 'Jessica Liu', phone: '+1 604-555-0104', status: 'inactive', tags: ['dormant_60d'], vip: 'Regular', visits: 1, points: 0, package: '—', remaining: 0, lastVisit: '90 days ago', birthday: 'Jan 19', email: '', totalSpent: 65 },
];

const SERVICES = [
  { name: 'Gel Manicure', duration: 60, price: 65, credits: 1, category: 'Nails', active: true },
  { name: 'Nail Art Design', duration: 90, price: 95, credits: 2, category: 'Nails', active: true },
  { name: 'Gel Pedicure', duration: 75, price: 75, credits: 1, category: 'Nails', active: true },
  { name: 'Nail Removal + Redo', duration: 90, price: 85, credits: 1, category: 'Nails', active: true },
  { name: 'Eyelash Extensions', duration: 120, price: 120, credits: 2, category: 'Lashes', active: true },
];

const BOOKINGS = [
  { id: 1, member: 'Anna Park', service: 'Gel Manicure', staff: 'Lisa Chen', time: 'Tomorrow 3:00 PM', code: '483291', status: 'confirmed' },
  { id: 2, member: '王小美', service: 'Nail Art Design', staff: 'Amy Wang', time: 'Day after 10:00 AM', code: '729104', status: 'confirmed' },
  { id: 3, member: 'Mary Johnson', service: 'Gel Pedicure', staff: 'Sarah Kim', time: 'Thu 2:00 PM', code: '615823', status: 'confirmed' },
  { id: 4, member: 'Anna Park', service: 'Gel Manicure', staff: 'Lisa Chen', time: 'Yesterday 2:00 PM', code: '158367', status: 'completed' },
  { id: 5, member: 'Mary Johnson', service: 'Nail Art Design', staff: 'Amy Wang', time: '3 days ago 11:00 AM', code: '942156', status: 'completed' },
];

const PACKAGES = [
  { name: 'Gel Nails 10-Pack', type: 'sessions', units: 10, price: 580, validDays: 365, members: 2 },
  { name: 'Gel Nails 5-Pack', type: 'sessions', units: 5, price: 300, validDays: 180, members: 1 },
  { name: 'Store Credit $200', type: 'amount', units: 200, price: 180, validDays: 365, members: 1 },
];

const COUPONS = [
  { id: 'C001', name: 'WELCOME15', type: 'percent', value: 15, minSpend: 50, maxUses: 100, used: 23, validFrom: '2026-01-01', validTo: '2026-06-30', status: 'active', vipOnly: false, description: 'New member welcome 15% off' },
  { id: 'C002', name: 'VIP10OFF', type: 'fixed', value: 10, minSpend: 80, maxUses: 50, used: 12, validFrom: '2026-03-01', validTo: '2026-12-31', status: 'active', vipOnly: true, description: 'VIP exclusive $10 off' },
  { id: 'C003', name: 'BDAY25', type: 'percent', value: 25, minSpend: 0, maxUses: 999, used: 5, validFrom: '2026-01-01', validTo: '2026-12-31', status: 'active', vipOnly: false, description: 'Birthday month 25% off' },
  { id: 'C004', name: 'SPRING20', type: 'percent', value: 20, minSpend: 100, maxUses: 30, used: 30, validFrom: '2026-03-01', validTo: '2026-03-31', status: 'expired', vipOnly: false, description: 'Spring promo 20% off' },
  { id: 'C005', name: 'FREESHIP', type: 'shipping', value: 0, minSpend: 60, maxUses: 200, used: 45, validFrom: '2026-01-01', validTo: '2026-12-31', status: 'active', vipOnly: false, description: 'Free shipping over $60' },
  { id: 'C006', name: 'REFER20', type: 'fixed', value: 20, minSpend: 0, maxUses: 999, used: 8, validFrom: '2026-01-01', validTo: '2026-12-31', status: 'active', vipOnly: false, description: 'Referral reward $20 off' },
];

const COUPON_USAGE = [
  { code: 'WELCOME15', member: '王小美', date: 'Apr 2', order: '#1042', discount: '$9.75', original: '$65.00' },
  { code: 'VIP10OFF', member: 'Anna Park', date: 'Apr 1', order: '#1038', discount: '$10.00', original: '$95.00' },
  { code: 'BDAY25', member: 'Mary Johnson', date: 'Mar 28', order: '#1031', discount: '$16.25', original: '$65.00' },
  { code: 'WELCOME15', member: 'Emily Zhang', date: 'Mar 25', order: '#1027', discount: '$14.25', original: '$95.00' },
  { code: 'FREESHIP', member: 'Anna Park', date: 'Mar 20', order: '#1019', discount: '$12.00', original: '$85.00' },
  { code: 'SPRING20', member: '王小美', date: 'Mar 15', order: '#1012', discount: '$19.00', original: '$95.00' },
];

const POINTS_LOG = [
  { member: 'Anna Park', amount: '+50', type: 'Review reward', desc: 'Left 5-star Google review', date: 'Apr 3' },
  { member: 'Anna Park', amount: '+100', type: 'Referral', desc: 'Referred Emily Zhang', date: 'Mar 20' },
  { member: 'Anna Park', amount: '-30', type: 'Redeem', desc: 'Redeemed for $3 discount', date: 'Mar 15' },
  { member: 'Anna Park', amount: '+300', type: 'Purchase', desc: 'Purchased Gel Nails 10-Pack', date: 'Feb 10' },
  { member: 'Mary Johnson', amount: '+50', type: 'Review reward', desc: 'Left 4-star Google review', date: 'Apr 1' },
  { member: 'Mary Johnson', amount: '+300', type: 'Purchase', desc: 'Purchased Gel Nails 10-Pack', date: 'Mar 5' },
  { member: '王小美', amount: '+150', type: 'Purchase', desc: 'Purchased Gel Nails 5-Pack', date: 'Mar 12' },
  { member: '王小美', amount: '+30', type: 'Birthday bonus', desc: 'Birthday month double points', date: 'Mar 8' },
  { member: 'Emily Zhang', amount: '+50', type: 'Review reward', desc: 'Left feedback (internal)', date: 'Feb 20' },
];

const REVIEWS = [
  { member: 'Anna Park', rating: 5, text: 'Lisa always does amazing gel nails! The studio is clean and welcoming.', staff: 'Lisa Chen', date: 'Apr 3', source: 'Google', aiReply: 'Thank you so much, Anna! Lisa loves working with you. See you next time! 🌸', status: 'replied' },
  { member: 'Mary Johnson', rating: 4, text: 'Great service, very professional. Slightly longer wait than expected.', staff: 'Amy Wang', date: 'Apr 1', source: 'Google', aiReply: 'Thanks Mary! We appreciate your patience. We\'re working on reducing wait times. 💅', status: 'replied' },
  { member: 'Emily Zhang', rating: 2, text: 'Had to wait 20 min past my appointment time. Felt rushed after.', staff: 'Lisa Chen', date: 'Feb 20', source: 'Internal', aiReply: '', status: 'internal' },
  { member: '王小美', rating: 5, text: '超喜歡這裡的美甲！技術很好，環境也很舒服。', staff: 'Amy Wang', date: 'Mar 28', source: 'Google', aiReply: '謝謝小美的好評！我們很高興你喜歡，期待下次見面！💖', status: 'replied' },
  { member: 'Anna Park', rating: 5, text: 'Best nail salon in Richmond! Highly recommend.', staff: 'Sarah Kim', date: 'Mar 10', source: 'Google', aiReply: 'We\'re so grateful for your kind words, Anna! Richmond\'s best kept secret 😉', status: 'replied' },
];

const SMS_LOG = [
  { to: 'Anna Park', phone: '604-555-0105', type: 'Booking Reminder', message: 'Hi Anna, reminder: Gel Manicure tomorrow 3:00 PM with Lisa.', status: 'delivered', date: 'Apr 4, 3:00 PM' },
  { to: 'Mary Johnson', phone: '604-555-0101', type: 'Feedback Invite', message: 'Hi Mary, thanks for visiting! Share your feedback & earn 50 points.', status: 'delivered', date: 'Apr 1, 4:00 PM' },
  { to: 'Emily Zhang', phone: '604-555-0103', type: 'Dormant 30d', message: 'Hi Emily, we miss you! Book now and get 2x bonus points.', status: 'delivered', date: 'Mar 30, 10:00 AM' },
  { to: '王小美', phone: '604-555-0102', type: 'Birthday', message: 'Happy birthday 小美！🎂 Use code BDAY25 for 25% off this month.', status: 'delivered', date: 'Mar 8, 9:00 AM' },
  { to: 'Anna Park', phone: '604-555-0105', type: 'Credit Expiry', message: 'Hi Anna, your Gel Nails 10-Pack expires in 30 days. 2 sessions left.', status: 'delivered', date: 'Mar 5, 11:00 AM' },
  { to: 'Jessica Liu', phone: '604-555-0104', type: 'Dormant 60d', message: 'Hi Jessica, it\'s been a while! We have new nail art designs.', status: 'failed', date: 'Mar 1, 10:00 AM' },
  { to: 'Mary Johnson', phone: '604-555-0101', type: 'Booking Confirm', message: 'Hi Mary, your Gel Pedicure is confirmed for Thu 2:00 PM.', status: 'delivered', date: 'Apr 3, 6:00 PM' },
];

const REVENUE_DAILY = [
  { date: 'Mon', amount: 520, bookings: 8 },
  { date: 'Tue', amount: 390, bookings: 6 },
  { date: 'Wed', amount: 650, bookings: 10 },
  { date: 'Thu', amount: 455, bookings: 7 },
  { date: 'Fri', amount: 780, bookings: 12 },
  { date: 'Sat', amount: 910, bookings: 14 },
  { date: 'Sun', amount: 0, bookings: 0 },
];

const STAFF_STATS = [
  { name: 'Lisa Chen', checkins: 156, rating: 4.8, commission: '$3,640', reviews: 12, topReview: 'Always perfect nails!' },
  { name: 'Amy Wang', checkins: 98, rating: 4.5, commission: '$2,058', reviews: 8, topReview: 'Very detailed work' },
  { name: 'Sarah Kim', checkins: 72, rating: 4.9, commission: '$1,296', reviews: 5, topReview: 'Best service ever!' },
];

// ─── Component ───

export default function AdminDemoPage() {
  const [activeTab, setActiveTab] = useState<Tab>('today');
  const [verifyCode, setVerifyCode] = useState('');
  const [verifyResult, setVerifyResult] = useState<'idle' | 'success' | 'error'>('idle');
  const [memberSearch, setMemberSearch] = useState('');
  const [couponFilter, setCouponFilter] = useState<'all' | 'active' | 'expired'>('all');
  const [smsFilter, setSmsFilter] = useState<'all' | 'delivered' | 'failed'>('all');
  const [showCouponUsage, setShowCouponUsage] = useState(false);

  function handleVerify() {
    if (verifyCode === '483291') setVerifyResult('success');
    else if (verifyCode.length === 6) setVerifyResult('error');
  }

  const filteredMembers = MEMBERS.filter(m => m.name.toLowerCase().includes(memberSearch.toLowerCase()) || m.phone.includes(memberSearch));
  const filteredCoupons = COUPONS.filter(c => couponFilter === 'all' || c.status === couponFilter);
  const filteredSms = SMS_LOG.filter(s => smsFilter === 'all' || s.status === smsFilter);

  const maxRevenue = Math.max(...REVENUE_DAILY.map(d => d.amount));

  const S: React.CSSProperties = { background: '#07070d', color: '#ededf5', minHeight: '100vh', fontFamily: "'Inter', -apple-system, sans-serif" };
  const card: React.CSSProperties = { background: '#0f0f1a', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', padding: '16px' };
  const badge = (color: string) => ({ display: 'inline-block', padding: '2px 8px', borderRadius: '99px', fontSize: '10px', fontWeight: 700 as const, background: color + '18', color, border: `1px solid ${color}40` });
  const filterBtn = (active: boolean) => ({ padding: '6px 14px', borderRadius: '8px', border: 'none', cursor: 'pointer' as const, fontSize: '11px', fontWeight: 600 as const, background: active ? '#E8654A20' : 'transparent', color: active ? '#E8654A' : '#6b6b96' });

  return (
    <div style={S}>
      {/* Top bar */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: 'rgba(7,7,13,0.95)', backdropFilter: 'blur(10px)', zIndex: 50 }}>
        <div>
          <div style={{ fontSize: '14px', fontWeight: 800 }}>Lush Nail Studio</div>
          <div style={{ fontSize: '10px', color: '#6b6b96' }}>Admin Dashboard</div>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <Link href={`/m/${DEMO_TOKEN}`} style={{ fontSize: '11px', color: '#8b5cf6', textDecoration: 'none' }}>👤 Member View</Link>
          <Link href="/p/quote" style={{ fontSize: '11px', color: '#6b6b96', textDecoration: 'none' }}>← Quote</Link>
          <div style={{ fontSize: '9px', color: '#E8654A', background: 'rgba(232,101,74,0.1)', border: '1px solid rgba(232,101,74,0.3)', padding: '3px 8px', borderRadius: '99px' }}>DEMO</div>
        </div>
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', overflowX: 'auto', gap: '2px', padding: '8px 8px', borderBottom: '1px solid rgba(255,255,255,0.07)', background: '#0a0a14' }}>
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => { setActiveTab(tab.id); setVerifyResult('idle'); setVerifyCode(''); }} style={{
            padding: '7px 12px', borderRadius: '8px', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap', fontSize: '11px', fontWeight: activeTab === tab.id ? 700 : 500,
            background: activeTab === tab.id ? '#E8654A20' : 'transparent',
            color: activeTab === tab.id ? '#E8654A' : '#6b6b96',
          }}>
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      <div style={{ padding: '16px' }}>

        {/* ═══ TODAY ═══ */}
        {activeTab === 'today' && (
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '16px' }}>📋 Today&apos;s Overview</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '16px' }}>
              {[{ n: '$780', l: 'Revenue', c: '#22c55e' }, { n: '12', l: 'Bookings', c: '#3b82f6' }, { n: '3', l: 'Check-ins', c: '#f5c842' }, { n: '89', l: 'Members', c: '#8b5cf6' }].map(s => (
                <div key={s.l} style={{ ...card, textAlign: 'center' as const, padding: '12px 8px' }}>
                  <div style={{ fontSize: '20px', fontWeight: 900, color: s.c }}>{s.n}</div>
                  <div style={{ fontSize: '10px', color: '#6b6b96' }}>{s.l}</div>
                </div>
              ))}
            </div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#6b6b96', marginBottom: '8px', letterSpacing: '1px' }}>UPCOMING</div>
            {BOOKINGS.filter(b => b.status === 'confirmed').map(b => (
              <div key={b.id} style={{ ...card, marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 700 }}>{b.member}</div>
                  <div style={{ fontSize: '12px', color: '#6b6b96' }}>{b.service} · {b.staff}</div>
                  <div style={{ fontSize: '11px', color: '#9898b8' }}>{b.time}</div>
                </div>
                <div style={{ textAlign: 'right' as const }}>
                  <div style={{ fontSize: '18px', fontWeight: 900, fontFamily: 'monospace', color: '#f5c842', letterSpacing: '2px' }}>{b.code}</div>
                  <span style={badge('#22c55e')}>Confirmed</span>
                </div>
              </div>
            ))}
            <div style={{ ...card, marginTop: '16px', background: 'rgba(239,68,68,0.06)', borderColor: 'rgba(239,68,68,0.2)' }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#ef4444', marginBottom: '4px' }}>⚠️ AI Alert</div>
              <div style={{ fontSize: '12px', color: '#9898b8' }}>2 dormant members · 1 package expiring in 30 days · 1 SMS delivery failed</div>
              <button onClick={() => setActiveTab('performance')} style={{ fontSize: '11px', color: '#E8654A', background: 'none', border: 'none', cursor: 'pointer', marginTop: '6px', fontWeight: 600 }}>View details →</button>
            </div>
          </div>
        )}

        {/* ═══ MEMBERS ═══ */}
        {activeTab === 'members' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 800 }}>👥 Members ({MEMBERS.length})</h2>
              <button style={{ ...badge('#22c55e'), padding: '6px 12px', cursor: 'pointer', border: 'none' }}>+ Add</button>
            </div>
            <input value={memberSearch} onChange={e => setMemberSearch(e.target.value)} placeholder="Search name or phone..." style={{ width: '100%', padding: '10px 14px', background: '#0f0f1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#ededf5', fontSize: '13px', marginBottom: '12px', outline: 'none' }} />
            {filteredMembers.map((m, i) => (
              <div key={i} style={{ ...card, marginBottom: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {m.name}
                      {m.vip !== 'Regular' && <span style={badge(m.vip === 'Gold' ? '#f5c842' : '#9898b8')}>{m.vip}</span>}
                      {m.tags.includes('dormant_30d') && <span style={badge('#ef4444')}>30d dormant</span>}
                      {m.tags.includes('dormant_60d') && <span style={badge('#ef4444')}>60d+</span>}
                    </div>
                    <div style={{ fontSize: '11px', color: '#6b6b96', marginTop: '2px' }}>{m.phone} · {m.visits} visits · Last: {m.lastVisit}</div>
                    <div style={{ fontSize: '10px', color: '#6b6b96', marginTop: '1px' }}>🎂 {m.birthday} · Total spent: ${m.totalSpent}</div>
                  </div>
                  <div style={{ textAlign: 'right' as const }}>
                    <div style={{ fontSize: '12px', color: '#E8654A', fontWeight: 700 }}>{m.remaining > 0 ? `${m.remaining} left` : '—'}</div>
                    <div style={{ fontSize: '10px', color: '#6b6b96' }}>{m.package}</div>
                    <div style={{ fontSize: '10px', color: '#f5c842' }}>⭐ {m.points} pts</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                  <button style={{ fontSize: '10px', padding: '4px 10px', borderRadius: '6px', background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.3)', color: '#8b5cf6', cursor: 'pointer' }}>📱 Send Link</button>
                  <button style={{ fontSize: '10px', padding: '4px 10px', borderRadius: '6px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#9898b8', cursor: 'pointer' }}>📝 Note</button>
                  <button style={{ fontSize: '10px', padding: '4px 10px', borderRadius: '6px', background: 'rgba(245,200,66,0.1)', border: '1px solid rgba(245,200,66,0.3)', color: '#f5c842', cursor: 'pointer' }}>🎫 Add Package</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ═══ VERIFY ═══ */}
        {activeTab === 'verify' && (
          <div style={{ textAlign: 'center', paddingTop: '32px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '8px' }}>✅ Check-in</h2>
            <p style={{ fontSize: '13px', color: '#6b6b96', marginBottom: '24px' }}>Enter the 6-digit code from customer</p>
            <input value={verifyCode} onChange={e => { setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6)); setVerifyResult('idle'); }} placeholder="000000" maxLength={6} autoFocus style={{ fontSize: '48px', fontWeight: 900, fontFamily: 'monospace', letterSpacing: '12px', textAlign: 'center', width: '280px', padding: '16px', background: '#0f0f1a', border: verifyResult === 'error' ? '2px solid #ef4444' : '2px solid rgba(255,255,255,0.1)', borderRadius: '16px', color: '#ededf5', outline: 'none' }} />
            {verifyCode.length === 6 && verifyResult === 'idle' && (
              <div style={{ marginTop: '24px' }}>
                <div style={{ ...card, maxWidth: '320px', margin: '0 auto 16px', textAlign: 'left' as const }}>
                  <div style={{ fontSize: '14px', fontWeight: 700 }}>Anna Park <span style={badge('#f5c842')}>Gold VIP</span></div>
                  <div style={{ fontSize: '12px', color: '#6b6b96', marginTop: '4px' }}>Gel Manicure · Lisa Chen · Tomorrow 3:00 PM</div>
                  <div style={{ fontSize: '12px', color: '#E8654A', fontWeight: 600, marginTop: '6px' }}>Deduct: 1 credit from 10-Pack (2 → 1 remaining)</div>
                  <div style={{ fontSize: '11px', color: '#22c55e', marginTop: '2px' }}>Coupon VIP10OFF applicable (-$10)</div>
                </div>
                <button onClick={handleVerify} style={{ fontSize: '16px', fontWeight: 800, padding: '14px 48px', borderRadius: '12px', border: 'none', background: '#22c55e', color: '#fff', cursor: 'pointer' }}>✓ Confirm Check-in</button>
              </div>
            )}
            {verifyResult === 'success' && (
              <div style={{ marginTop: '24px' }}>
                <div style={{ fontSize: '64px', marginBottom: '8px' }}>✅</div>
                <div style={{ fontSize: '20px', fontWeight: 800, color: '#22c55e' }}>Check-in Complete!</div>
                <div style={{ fontSize: '14px', color: '#9898b8', marginTop: '8px' }}>Anna Park · Gel Manicure · Lisa Chen</div>
                <div style={{ fontSize: '24px', fontWeight: 900, color: '#f5c842', marginTop: '8px' }}>1 session remaining</div>
                <div style={{ fontSize: '12px', color: '#6b6b96', marginTop: '4px' }}>+50 points earned · SMS feedback invite in 2 hours</div>
                <button onClick={() => { setVerifyCode(''); setVerifyResult('idle'); }} style={{ marginTop: '20px', fontSize: '13px', padding: '10px 24px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#9898b8', cursor: 'pointer' }}>Next check-in</button>
              </div>
            )}
            {verifyResult === 'error' && (
              <div style={{ marginTop: '24px' }}>
                <div style={{ fontSize: '48px' }}>❌</div>
                <div style={{ fontSize: '16px', fontWeight: 700, color: '#ef4444', marginTop: '8px' }}>Invalid code</div>
                <p style={{ fontSize: '12px', color: '#6b6b96', marginTop: '4px' }}>Try: 483291</p>
                <button onClick={() => { setVerifyCode(''); setVerifyResult('idle'); }} style={{ marginTop: '12px', fontSize: '12px', padding: '8px 20px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#9898b8', cursor: 'pointer' }}>Try again</button>
              </div>
            )}
          </div>
        )}

        {/* ═══ BOOKINGS ═══ */}
        {activeTab === 'bookings' && (
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '12px' }}>📅 Bookings</h2>
            {BOOKINGS.map(b => (
              <div key={b.id} style={{ ...card, marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 700 }}>{b.member}</div>
                  <div style={{ fontSize: '12px', color: '#6b6b96' }}>{b.service} · {b.staff}</div>
                  <div style={{ fontSize: '11px', color: '#9898b8' }}>{b.time}</div>
                </div>
                <div style={{ textAlign: 'right' as const }}>
                  <div style={{ fontSize: '16px', fontWeight: 900, fontFamily: 'monospace', color: b.status === 'completed' ? '#22c55e' : '#f5c842', letterSpacing: '1px' }}>{b.code}</div>
                  <span style={badge(b.status === 'completed' ? '#22c55e' : '#3b82f6')}>{b.status}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ═══ PACKAGES ═══ */}
        {activeTab === 'packages' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 800 }}>🎫 Packages</h2>
              <button style={{ ...badge('#22c55e'), padding: '6px 12px', cursor: 'pointer', border: 'none' }}>+ Create</button>
            </div>
            {PACKAGES.map((p, i) => (
              <div key={i} style={{ ...card, marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 700 }}>{p.name}</div>
                  <div style={{ fontSize: '12px', color: '#6b6b96' }}>{p.type} · {p.units} units · Valid {p.validDays} days</div>
                </div>
                <div style={{ textAlign: 'right' as const }}>
                  <div style={{ fontSize: '16px', fontWeight: 900, color: '#f5c842' }}>${p.price}</div>
                  <div style={{ fontSize: '10px', color: '#6b6b96' }}>{p.members} active</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ═══ SERVICES ═══ */}
        {activeTab === 'services' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 800 }}>✂️ Services</h2>
              <button style={{ ...badge('#22c55e'), padding: '6px 12px', cursor: 'pointer', border: 'none' }}>+ Add</button>
            </div>
            <div style={{ fontSize: '11px', color: '#6b6b96', marginBottom: '12px' }}>🕐 Mon–Fri 9AM–6PM · Sat 10AM–5PM · Sun Closed</div>
            {SERVICES.map((s, i) => (
              <div key={i} style={{ ...card, marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 700 }}>{s.name}</div>
                  <div style={{ fontSize: '12px', color: '#6b6b96' }}>{s.duration} min · {s.credits} credit{s.credits > 1 ? 's' : ''} · {s.category}</div>
                </div>
                <div style={{ textAlign: 'right' as const }}>
                  <div style={{ fontSize: '16px', fontWeight: 800 }}>${s.price}</div>
                  <span style={badge('#22c55e')}>Active</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ═══ COUPONS ═══ */}
        {activeTab === 'coupons' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 800 }}>🎁 Coupons</h2>
              <button style={{ ...badge('#22c55e'), padding: '6px 12px', cursor: 'pointer', border: 'none' }}>+ Create</button>
            </div>

            <div style={{ display: 'flex', gap: '4px', marginBottom: '12px' }}>
              {(['all', 'active', 'expired'] as const).map(f => (
                <button key={f} onClick={() => setCouponFilter(f)} style={filterBtn(couponFilter === f)}>
                  {f === 'all' ? `All (${COUPONS.length})` : f === 'active' ? `Active (${COUPONS.filter(c => c.status === 'active').length})` : `Expired (${COUPONS.filter(c => c.status === 'expired').length})`}
                </button>
              ))}
              <button onClick={() => setShowCouponUsage(!showCouponUsage)} style={{ ...filterBtn(showCouponUsage), marginLeft: 'auto' }}>
                {showCouponUsage ? '← Back to list' : '📋 Usage Log'}
              </button>
            </div>

            {!showCouponUsage ? (
              <>
                {filteredCoupons.map((c, i) => (
                  <div key={i} style={{ ...card, marginBottom: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontFamily: 'monospace', background: 'rgba(245,200,66,0.1)', padding: '2px 8px', borderRadius: '4px', color: '#f5c842' }}>{c.name}</span>
                          <span style={badge(c.status === 'active' ? '#22c55e' : '#ef4444')}>{c.status}</span>
                          {c.vipOnly && <span style={badge('#f5c842')}>VIP Only</span>}
                        </div>
                        <div style={{ fontSize: '12px', color: '#9898b8', marginTop: '4px' }}>{c.description}</div>
                        <div style={{ fontSize: '11px', color: '#6b6b96', marginTop: '2px' }}>
                          {c.type === 'percent' ? `${c.value}% off` : c.type === 'fixed' ? `$${c.value} off` : 'Free shipping'}
                          {c.minSpend > 0 ? ` · Min $${c.minSpend}` : ''}
                          {' · '}{c.validFrom} to {c.validTo}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' as const }}>
                        <div style={{ fontSize: '20px', fontWeight: 900, color: c.type === 'percent' ? '#E8654A' : '#22c55e' }}>
                          {c.type === 'percent' ? `${c.value}%` : c.type === 'fixed' ? `$${c.value}` : 'Free'}
                        </div>
                        <div style={{ fontSize: '10px', color: '#6b6b96' }}>{c.used}/{c.maxUses} used</div>
                        {/* Usage bar */}
                        <div style={{ width: '60px', height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', marginTop: '4px' }}>
                          <div style={{ width: `${(c.used / c.maxUses) * 100}%`, height: '100%', background: c.used >= c.maxUses ? '#ef4444' : '#22c55e', borderRadius: '2px' }} />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </>
            ) : (
              <>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#6b6b96', marginBottom: '8px' }}>RECENT USAGE</div>
                {COUPON_USAGE.map((u, i) => (
                  <div key={i} style={{ ...card, marginBottom: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px' }}>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 600 }}>{u.member} · <span style={{ fontFamily: 'monospace', color: '#f5c842' }}>{u.code}</span></div>
                      <div style={{ fontSize: '11px', color: '#6b6b96' }}>{u.date} · Order {u.order}</div>
                    </div>
                    <div style={{ textAlign: 'right' as const }}>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: '#22c55e' }}>-{u.discount}</div>
                      <div style={{ fontSize: '10px', color: '#6b6b96' }}>from {u.original}</div>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        {/* ═══ POINTS ═══ */}
        {activeTab === 'points' && (
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '4px' }}>⭐ Points Transactions</h2>
            <div style={{ fontSize: '12px', color: '#6b6b96', marginBottom: '16px' }}>1 point = CAD $0.01 · Review = 50 pts · Referral = 100 pts · Purchase = varies</div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '16px' }}>
              <div style={{ ...card, textAlign: 'center' as const, padding: '10px' }}>
                <div style={{ fontSize: '18px', fontWeight: 900, color: '#22c55e' }}>1,100</div>
                <div style={{ fontSize: '10px', color: '#6b6b96' }}>Total Issued</div>
              </div>
              <div style={{ ...card, textAlign: 'center' as const, padding: '10px' }}>
                <div style={{ fontSize: '18px', fontWeight: 900, color: '#ef4444' }}>30</div>
                <div style={{ fontSize: '10px', color: '#6b6b96' }}>Redeemed</div>
              </div>
              <div style={{ ...card, textAlign: 'center' as const, padding: '10px' }}>
                <div style={{ fontSize: '18px', fontWeight: 900, color: '#f5c842' }}>1,070</div>
                <div style={{ fontSize: '10px', color: '#6b6b96' }}>Outstanding</div>
              </div>
            </div>

            {POINTS_LOG.map((p, i) => (
              <div key={i} style={{ ...card, marginBottom: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px' }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600 }}>{p.member}</div>
                  <div style={{ fontSize: '11px', color: '#6b6b96' }}>{p.desc}</div>
                  <div style={{ fontSize: '10px', color: '#6b6b96' }}>{p.date} · {p.type}</div>
                </div>
                <div style={{ fontSize: '16px', fontWeight: 900, color: p.amount.startsWith('+') ? '#22c55e' : '#ef4444' }}>{p.amount}</div>
              </div>
            ))}
          </div>
        )}

        {/* ═══ REVIEWS ═══ */}
        {activeTab === 'reviews' && (
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '4px' }}>💬 Reviews</h2>
            <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', fontSize: '13px' }}>
              <span>⭐ 4.7 avg</span>
              <span style={{ color: '#6b6b96' }}>·</span>
              <span>{REVIEWS.filter(r => r.source === 'Google').length} Google</span>
              <span style={{ color: '#6b6b96' }}>·</span>
              <span>{REVIEWS.filter(r => r.status === 'internal').length} Internal</span>
            </div>
            {REVIEWS.map((r, i) => (
              <div key={i} style={{ ...card, marginBottom: '8px', borderColor: r.status === 'internal' ? 'rgba(239,68,68,0.2)' : undefined }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                  <div>
                    <span style={{ fontSize: '13px', fontWeight: 700 }}>{r.member}</span>
                    <span style={{ fontSize: '11px', color: '#6b6b96', marginLeft: '8px' }}>→ {r.staff} · {r.date}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={badge(r.source === 'Google' ? '#3b82f6' : '#ef4444')}>{r.source}</span>
                    <span style={{ color: '#f5c842', fontSize: '12px' }}>{'⭐'.repeat(r.rating)}</span>
                  </div>
                </div>
                <div style={{ fontSize: '13px', color: '#9898b8', marginBottom: r.aiReply ? '8px' : '0' }}>&ldquo;{r.text}&rdquo;</div>
                {r.aiReply && (
                  <div style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.15)', borderRadius: '8px', padding: '8px 12px', marginTop: '6px' }}>
                    <div style={{ fontSize: '10px', color: '#22c55e', fontWeight: 700, marginBottom: '2px' }}>🤖 AI Reply (auto-published)</div>
                    <div style={{ fontSize: '12px', color: '#9898b8' }}>{r.aiReply}</div>
                  </div>
                )}
                {r.status === 'internal' && (
                  <div style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: '8px', padding: '8px 12px', marginTop: '6px' }}>
                    <div style={{ fontSize: '10px', color: '#ef4444', fontWeight: 700 }}>🔒 Internal only — not published to Google</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ═══ SMS LOG ═══ */}
        {activeTab === 'sms' && (
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '4px' }}>📱 SMS Log</h2>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', fontSize: '12px', color: '#6b6b96' }}>
              <span>Total: {SMS_LOG.length}</span>
              <span>·</span>
              <span style={{ color: '#22c55e' }}>Delivered: {SMS_LOG.filter(s => s.status === 'delivered').length}</span>
              <span>·</span>
              <span style={{ color: '#ef4444' }}>Failed: {SMS_LOG.filter(s => s.status === 'failed').length}</span>
            </div>
            <div style={{ display: 'flex', gap: '4px', marginBottom: '12px' }}>
              {(['all', 'delivered', 'failed'] as const).map(f => (
                <button key={f} onClick={() => setSmsFilter(f)} style={filterBtn(smsFilter === f)}>{f}</button>
              ))}
            </div>
            {filteredSms.map((s, i) => (
              <div key={i} style={{ ...card, marginBottom: '6px', padding: '12px 16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 600 }}>{s.to} <span style={{ color: '#6b6b96', fontWeight: 400, fontSize: '11px' }}>{s.phone}</span></div>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <span style={badge(s.type.includes('Reminder') || s.type.includes('Confirm') ? '#3b82f6' : s.type.includes('Feedback') ? '#22c55e' : s.type.includes('Dormant') ? '#ef4444' : s.type.includes('Birthday') ? '#8b5cf6' : '#f5c842')}>{s.type}</span>
                    <span style={badge(s.status === 'delivered' ? '#22c55e' : '#ef4444')}>{s.status}</span>
                  </div>
                </div>
                <div style={{ fontSize: '12px', color: '#9898b8' }}>{s.message}</div>
                <div style={{ fontSize: '10px', color: '#6b6b96', marginTop: '4px' }}>{s.date}</div>
              </div>
            ))}
          </div>
        )}

        {/* ═══ REVENUE ═══ */}
        {activeTab === 'revenue' && (
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '16px' }}>💰 Revenue</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '20px' }}>
              <div style={{ ...card, textAlign: 'center' as const, padding: '12px' }}>
                <div style={{ fontSize: '22px', fontWeight: 900, color: '#22c55e' }}>$3,705</div>
                <div style={{ fontSize: '10px', color: '#6b6b96' }}>This Week</div>
              </div>
              <div style={{ ...card, textAlign: 'center' as const, padding: '12px' }}>
                <div style={{ fontSize: '22px', fontWeight: 900, color: '#3b82f6' }}>$12,580</div>
                <div style={{ fontSize: '10px', color: '#6b6b96' }}>This Month</div>
              </div>
              <div style={{ ...card, textAlign: 'center' as const, padding: '12px' }}>
                <div style={{ fontSize: '22px', fontWeight: 900, color: '#f5c842' }}>57</div>
                <div style={{ fontSize: '10px', color: '#6b6b96' }}>Bookings/Wk</div>
              </div>
            </div>

            {/* Bar chart */}
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#6b6b96', marginBottom: '8px', letterSpacing: '1px' }}>DAILY REVENUE (THIS WEEK)</div>
            <div style={{ ...card, marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px', height: '120px' }}>
                {REVENUE_DAILY.map((d, i) => (
                  <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                    <div style={{ fontSize: '10px', color: '#9898b8', fontWeight: 600 }}>${d.amount}</div>
                    <div style={{ width: '100%', background: d.amount > 0 ? (d.date === 'Sat' ? '#f5c842' : '#E8654A') : 'rgba(255,255,255,0.05)', borderRadius: '4px 4px 0 0', height: `${d.amount > 0 ? (d.amount / maxRevenue) * 80 : 4}px`, transition: 'height 0.3s' }} />
                    <div style={{ fontSize: '10px', color: '#6b6b96' }}>{d.date}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top services */}
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#6b6b96', marginBottom: '8px', letterSpacing: '1px' }}>TOP SERVICES</div>
            {[{ name: 'Gel Manicure', rev: '$4,550', pct: 36, bookings: 70 }, { name: 'Nail Art Design', rev: '$3,420', pct: 27, bookings: 36 }, { name: 'Eyelash Extensions', rev: '$2,160', pct: 17, bookings: 18 }, { name: 'Gel Pedicure', rev: '$1,650', pct: 13, bookings: 22 }, { name: 'Removal + Redo', rev: '$800', pct: 7, bookings: 9 }].map((s, i) => (
              <div key={i} style={{ ...card, marginBottom: '6px', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600 }}>{s.name}</div>
                  <div style={{ fontSize: '11px', color: '#6b6b96' }}>{s.bookings} bookings · {s.pct}%</div>
                </div>
                <div style={{ fontSize: '16px', fontWeight: 900, color: '#22c55e' }}>{s.rev}</div>
              </div>
            ))}

            {/* Coupon impact */}
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#6b6b96', marginBottom: '8px', marginTop: '16px', letterSpacing: '1px' }}>COUPON IMPACT</div>
            <div style={{ ...card }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', color: '#6b6b96' }}>Coupons redeemed this month</span>
                <span style={{ fontSize: '14px', fontWeight: 700, color: '#E8654A' }}>18</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', color: '#6b6b96' }}>Total discount given</span>
                <span style={{ fontSize: '14px', fontWeight: 700, color: '#ef4444' }}>-$186.50</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '12px', color: '#6b6b96' }}>Revenue from coupon users</span>
                <span style={{ fontSize: '14px', fontWeight: 700, color: '#22c55e' }}>$1,420.00</span>
              </div>
              <div style={{ fontSize: '11px', color: '#22c55e', marginTop: '8px', fontWeight: 600 }}>ROI: Coupons generated 7.6x their cost in revenue</div>
            </div>
          </div>
        )}

        {/* ═══ PERFORMANCE ═══ */}
        {activeTab === 'performance' && (
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '16px' }}>📊 Performance</h2>

            <div style={{ fontSize: '11px', fontWeight: 700, color: '#6b6b96', marginBottom: '8px', letterSpacing: '1px' }}>STAFF RANKING</div>
            {STAFF_STATS.map((s, i) => (
              <div key={i} style={{ ...card, marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ fontSize: '18px' }}>{i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}</div>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 700 }}>{s.name}</div>
                    <div style={{ fontSize: '11px', color: '#6b6b96' }}>⭐ {s.rating} · {s.checkins} check-ins · {s.reviews} reviews</div>
                  </div>
                </div>
                <div style={{ fontSize: '14px', fontWeight: 800, color: '#22c55e' }}>{s.commission}</div>
              </div>
            ))}

            <div style={{ fontSize: '11px', fontWeight: 700, color: '#ef4444', marginBottom: '8px', marginTop: '20px', letterSpacing: '1px' }}>⚠️ DORMANT MEMBERS</div>
            {MEMBERS.filter(m => m.tags.some(t => t.startsWith('dormant'))).map((m, i) => (
              <div key={i} style={{ ...card, marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderColor: 'rgba(239,68,68,0.2)' }}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 700 }}>{m.name}</div>
                  <div style={{ fontSize: '11px', color: '#6b6b96' }}>Last: {m.lastVisit} · {m.package}</div>
                </div>
                <button style={{ fontSize: '11px', padding: '6px 14px', borderRadius: '8px', background: 'rgba(232,101,74,0.1)', border: '1px solid rgba(232,101,74,0.3)', color: '#E8654A', cursor: 'pointer', fontWeight: 600 }}>Send Reminder</button>
              </div>
            ))}

            <div style={{ fontSize: '11px', fontWeight: 700, color: '#f5c842', marginBottom: '8px', marginTop: '20px', letterSpacing: '1px' }}>⏰ EXPIRING SOON</div>
            <div style={{ ...card, borderColor: 'rgba(245,200,66,0.2)' }}>
              <div style={{ fontSize: '14px', fontWeight: 700 }}>Anna Park — Gel Nails 10-Pack</div>
              <div style={{ fontSize: '12px', color: '#6b6b96' }}>2 sessions remaining · Expires in 30 days</div>
              <div style={{ fontSize: '11px', color: '#f5c842', marginTop: '4px' }}>SMS reminder sent on Mar 5</div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ padding: '20px 16px', borderTop: '1px solid rgba(255,255,255,0.07)', textAlign: 'center', fontSize: '10px', color: '#6b6b96' }}>
        DEMO · All data is simulated · Lush Nail Studio · ReplyWise AI
      </div>
    </div>
  );
}
