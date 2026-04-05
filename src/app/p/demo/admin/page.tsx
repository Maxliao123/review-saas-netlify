'use client';

import { useState } from 'react';
import Link from 'next/link';

const DEMO_TOKEN = '3fd7ed1f3595a5b4cb8274fe0ac2d4a5';

type Tab = 'today' | 'members' | 'verify' | 'bookings' | 'packages' | 'services' | 'performance';

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'today', label: 'Today', icon: '📋' },
  { id: 'members', label: 'Members', icon: '👥' },
  { id: 'verify', label: 'Check-in', icon: '✅' },
  { id: 'bookings', label: 'Bookings', icon: '📅' },
  { id: 'packages', label: 'Packages', icon: '🎫' },
  { id: 'services', label: 'Services', icon: '✂️' },
  { id: 'performance', label: 'Stats', icon: '📊' },
];

const MEMBERS = [
  { name: 'Anna Park', phone: '+1 604-555-0105', status: 'active', tags: ['VIP'], visits: 18, points: 520, package: 'Gel Nails 10-Pack', remaining: 2, lastVisit: '1 day ago' },
  { name: 'Mary Johnson', phone: '+1 604-555-0101', status: 'active', tags: [], visits: 12, points: 350, package: 'Gel Nails 10-Pack', remaining: 7, lastVisit: '3 days ago' },
  { name: '王小美', phone: '+1 604-555-0102', status: 'active', tags: [], visits: 7, points: 180, package: 'Gel Nails 5-Pack', remaining: 3, lastVisit: '10 days ago' },
  { name: 'Emily Zhang', phone: '+1 604-555-0103', status: 'active', tags: ['dormant_30d'], visits: 3, points: 50, package: '—', remaining: 0, lastVisit: '45 days ago' },
  { name: 'Jessica Liu', phone: '+1 604-555-0104', status: 'inactive', tags: ['dormant_60d'], visits: 1, points: 0, package: '—', remaining: 0, lastVisit: '90 days ago' },
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
  { id: 3, member: 'Anna Park', service: 'Gel Manicure', staff: 'Lisa Chen', time: 'Yesterday 2:00 PM', code: '158367', status: 'completed' },
];

const PACKAGES = [
  { name: 'Gel Nails 10-Pack', type: 'sessions', units: 10, price: 580, validDays: 365, members: 2 },
  { name: 'Gel Nails 5-Pack', type: 'sessions', units: 5, price: 300, validDays: 180, members: 1 },
  { name: 'Store Credit $200', type: 'amount', units: 200, price: 180, validDays: 365, members: 1 },
];

const STAFF_STATS = [
  { name: 'Lisa Chen', checkins: 156, rating: 4.8, commission: '$3,640', topReview: 'Always perfect nails!' },
  { name: 'Amy Wang', checkins: 98, rating: 4.5, commission: '$2,058', topReview: 'Very detailed work' },
  { name: 'Sarah Kim', checkins: 72, rating: 4.9, commission: '$1,296', topReview: 'Best service ever!' },
];

export default function AdminDemoPage() {
  const [activeTab, setActiveTab] = useState<Tab>('today');
  const [verifyCode, setVerifyCode] = useState('');
  const [verifyResult, setVerifyResult] = useState<'idle' | 'success' | 'error'>('idle');
  const [memberSearch, setMemberSearch] = useState('');

  function handleVerify() {
    if (verifyCode === '483291') {
      setVerifyResult('success');
    } else if (verifyCode.length === 6) {
      setVerifyResult('error');
    }
  }

  const filteredMembers = MEMBERS.filter(m =>
    m.name.toLowerCase().includes(memberSearch.toLowerCase()) || m.phone.includes(memberSearch)
  );

  const S: React.CSSProperties = { background: '#07070d', color: '#ededf5', minHeight: '100vh', fontFamily: "'Inter', -apple-system, sans-serif" };
  const card: React.CSSProperties = { background: '#0f0f1a', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', padding: '16px' };
  const badge = (color: string) => ({ display: 'inline-block', padding: '2px 8px', borderRadius: '99px', fontSize: '10px', fontWeight: 700 as const, background: color + '18', color, border: `1px solid ${color}40` });

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

      {/* Sidebar tabs (horizontal on mobile) */}
      <div style={{ display: 'flex', overflowX: 'auto', gap: '4px', padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.07)', background: '#0a0a14' }}>
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => { setActiveTab(tab.id); setVerifyResult('idle'); setVerifyCode(''); }} style={{
            padding: '8px 14px', borderRadius: '8px', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap', fontSize: '12px', fontWeight: activeTab === tab.id ? 700 : 500,
            background: activeTab === tab.id ? '#E8654A20' : 'transparent',
            color: activeTab === tab.id ? '#E8654A' : '#6b6b96',
          }}>
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ padding: '16px' }}>

        {/* TODAY */}
        {activeTab === 'today' && (
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '16px' }}>📋 Today&apos;s Overview</h2>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '16px' }}>
              {[{ n: '3', l: 'Bookings' }, { n: '1', l: 'Completed' }, { n: '5', l: 'Members' }, { n: '$195', l: 'Revenue' }].map(s => (
                <div key={s.l} style={{ ...card, textAlign: 'center' as const, padding: '12px 8px' }}>
                  <div style={{ fontSize: '22px', fontWeight: 900, color: '#E8654A' }}>{s.n}</div>
                  <div style={{ fontSize: '10px', color: '#6b6b96' }}>{s.l}</div>
                </div>
              ))}
            </div>

            {/* Upcoming */}
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#6b6b96', marginBottom: '8px', letterSpacing: '1px' }}>UPCOMING</div>
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

            {/* AI Alert */}
            <div style={{ ...card, marginTop: '16px', background: 'rgba(239,68,68,0.06)', borderColor: 'rgba(239,68,68,0.2)' }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#ef4444', marginBottom: '4px' }}>⚠️ AI Alert</div>
              <div style={{ fontSize: '12px', color: '#9898b8' }}>2 members haven&apos;t visited in 30+ days. Emily Zhang (45 days), Jessica Liu (90 days).</div>
              <button onClick={() => setActiveTab('performance')} style={{ fontSize: '11px', color: '#E8654A', background: 'none', border: 'none', cursor: 'pointer', marginTop: '6px', fontWeight: 600 }}>View dormant list →</button>
            </div>
          </div>
        )}

        {/* MEMBERS */}
        {activeTab === 'members' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 800 }}>👥 Members</h2>
              <button style={{ ...badge('#22c55e'), padding: '6px 12px', cursor: 'pointer', border: 'none' }}>+ Add</button>
            </div>
            <input value={memberSearch} onChange={e => setMemberSearch(e.target.value)} placeholder="Search name or phone..." style={{ width: '100%', padding: '10px 14px', background: '#0f0f1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#ededf5', fontSize: '13px', marginBottom: '12px', outline: 'none' }} />

            {filteredMembers.map((m, i) => (
              <div key={i} style={{ ...card, marginBottom: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {m.name}
                      {m.tags.includes('VIP') && <span style={badge('#f5c842')}>VIP</span>}
                      {m.tags.includes('dormant_30d') && <span style={badge('#ef4444')}>30d dormant</span>}
                      {m.tags.includes('dormant_60d') && <span style={badge('#ef4444')}>60d dormant</span>}
                    </div>
                    <div style={{ fontSize: '11px', color: '#6b6b96', marginTop: '2px' }}>{m.phone} · {m.visits} visits · Last: {m.lastVisit}</div>
                  </div>
                  <div style={{ textAlign: 'right' as const }}>
                    <div style={{ fontSize: '12px', color: '#E8654A', fontWeight: 700 }}>{m.remaining > 0 ? `${m.remaining} left` : '—'}</div>
                    <div style={{ fontSize: '10px', color: '#6b6b96' }}>{m.package}</div>
                    <div style={{ fontSize: '10px', color: '#f5c842' }}>⭐ {m.points} pts</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                  <button style={{ fontSize: '10px', padding: '4px 10px', borderRadius: '6px', background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.3)', color: '#8b5cf6', cursor: 'pointer' }}>📱 Send Link</button>
                  <button style={{ fontSize: '10px', padding: '4px 10px', borderRadius: '6px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#9898b8', cursor: 'pointer' }}>📝 Note</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* VERIFY */}
        {activeTab === 'verify' && (
          <div style={{ textAlign: 'center', paddingTop: '32px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '8px' }}>✅ Check-in</h2>
            <p style={{ fontSize: '13px', color: '#6b6b96', marginBottom: '24px' }}>Enter the 6-digit code from customer</p>

            <input
              value={verifyCode}
              onChange={e => { setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6)); setVerifyResult('idle'); }}
              placeholder="000000"
              maxLength={6}
              autoFocus
              style={{ fontSize: '48px', fontWeight: 900, fontFamily: 'monospace', letterSpacing: '12px', textAlign: 'center', width: '280px', padding: '16px', background: '#0f0f1a', border: verifyResult === 'error' ? '2px solid #ef4444' : '2px solid rgba(255,255,255,0.1)', borderRadius: '16px', color: '#ededf5', outline: 'none' }}
            />

            {verifyCode.length === 6 && verifyResult === 'idle' && (
              <div style={{ marginTop: '24px' }}>
                <div style={{ ...card, maxWidth: '300px', margin: '0 auto 16px', textAlign: 'left' as const }}>
                  <div style={{ fontSize: '14px', fontWeight: 700 }}>Anna Park <span style={badge('#f5c842')}>VIP</span></div>
                  <div style={{ fontSize: '12px', color: '#6b6b96', marginTop: '4px' }}>Gel Manicure · Lisa Chen</div>
                  <div style={{ fontSize: '12px', color: '#6b6b96' }}>Tomorrow 3:00 PM</div>
                  <div style={{ fontSize: '12px', color: '#E8654A', fontWeight: 600, marginTop: '4px' }}>Deduct: 1 credit from 10-Pack (2 remaining → 1)</div>
                </div>
                <button onClick={handleVerify} style={{ fontSize: '16px', fontWeight: 800, padding: '14px 48px', borderRadius: '12px', border: 'none', background: '#22c55e', color: '#fff', cursor: 'pointer' }}>
                  ✓ Confirm Check-in
                </button>
              </div>
            )}

            {verifyResult === 'success' && (
              <div style={{ marginTop: '24px' }}>
                <div style={{ fontSize: '64px', marginBottom: '8px' }}>✅</div>
                <div style={{ fontSize: '20px', fontWeight: 800, color: '#22c55e' }}>Check-in Complete!</div>
                <div style={{ fontSize: '14px', color: '#9898b8', marginTop: '8px' }}>Anna Park · Gel Manicure</div>
                <div style={{ fontSize: '24px', fontWeight: 900, color: '#f5c842', marginTop: '8px' }}>1 session remaining</div>
                <button onClick={() => { setVerifyCode(''); setVerifyResult('idle'); }} style={{ marginTop: '20px', fontSize: '13px', padding: '10px 24px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#9898b8', cursor: 'pointer' }}>Next check-in</button>
              </div>
            )}

            {verifyResult === 'error' && (
              <div style={{ marginTop: '24px' }}>
                <div style={{ fontSize: '48px', marginBottom: '8px' }}>❌</div>
                <div style={{ fontSize: '16px', fontWeight: 700, color: '#ef4444' }}>Invalid code</div>
                <p style={{ fontSize: '12px', color: '#6b6b96', marginTop: '4px' }}>Try: 483291 for demo</p>
                <button onClick={() => { setVerifyCode(''); setVerifyResult('idle'); }} style={{ marginTop: '12px', fontSize: '12px', padding: '8px 20px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#9898b8', cursor: 'pointer' }}>Try again</button>
              </div>
            )}
          </div>
        )}

        {/* BOOKINGS */}
        {activeTab === 'bookings' && (
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '12px' }}>📅 All Bookings</h2>
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

        {/* PACKAGES */}
        {activeTab === 'packages' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 800 }}>🎫 Packages</h2>
              <button style={{ ...badge('#22c55e'), padding: '6px 12px', cursor: 'pointer', border: 'none' }}>+ Create</button>
            </div>
            {PACKAGES.map((p, i) => (
              <div key={i} style={{ ...card, marginBottom: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 700 }}>{p.name}</div>
                    <div style={{ fontSize: '12px', color: '#6b6b96' }}>{p.type} · {p.units} units · Valid {p.validDays} days</div>
                  </div>
                  <div style={{ textAlign: 'right' as const }}>
                    <div style={{ fontSize: '16px', fontWeight: 900, color: '#f5c842' }}>${p.price}</div>
                    <div style={{ fontSize: '10px', color: '#6b6b96' }}>{p.members} member{p.members > 1 ? 's' : ''} using</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* SERVICES */}
        {activeTab === 'services' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 800 }}>✂️ Services</h2>
              <button style={{ ...badge('#22c55e'), padding: '6px 12px', cursor: 'pointer', border: 'none' }}>+ Add</button>
            </div>
            <div style={{ fontSize: '11px', color: '#6b6b96', marginBottom: '8px' }}>🕐 Hours: Mon–Fri 9AM–6PM · Sat 10AM–5PM · Sun Closed</div>
            {SERVICES.map((s, i) => (
              <div key={i} style={{ ...card, marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 700 }}>{s.name}</div>
                  <div style={{ fontSize: '12px', color: '#6b6b96' }}>{s.duration} min · {s.credits} credit{s.credits > 1 ? 's' : ''} · {s.category}</div>
                </div>
                <div style={{ textAlign: 'right' as const }}>
                  <div style={{ fontSize: '16px', fontWeight: 800 }}>${s.price}</div>
                  <span style={badge(s.active ? '#22c55e' : '#6b6b96')}>{s.active ? 'Active' : 'Draft'}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* PERFORMANCE */}
        {activeTab === 'performance' && (
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '16px' }}>📊 Performance</h2>

            {/* Staff ranking */}
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#6b6b96', marginBottom: '8px', letterSpacing: '1px' }}>STAFF RANKING</div>
            {STAFF_STATS.map((s, i) => (
              <div key={i} style={{ ...card, marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ fontSize: '18px' }}>{i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}</div>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 700 }}>{s.name}</div>
                    <div style={{ fontSize: '11px', color: '#6b6b96' }}>⭐ {s.rating} · {s.checkins} check-ins</div>
                  </div>
                </div>
                <div style={{ fontSize: '14px', fontWeight: 800, color: '#22c55e' }}>{s.commission}</div>
              </div>
            ))}

            {/* Dormant members */}
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#ef4444', marginBottom: '8px', marginTop: '20px', letterSpacing: '1px' }}>⚠️ DORMANT MEMBERS</div>
            {MEMBERS.filter(m => m.tags.some(t => t.startsWith('dormant'))).map((m, i) => (
              <div key={i} style={{ ...card, marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderColor: 'rgba(239,68,68,0.2)' }}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 700 }}>{m.name}</div>
                  <div style={{ fontSize: '11px', color: '#6b6b96' }}>Last visit: {m.lastVisit} · {m.package}</div>
                </div>
                <button style={{ fontSize: '11px', padding: '6px 14px', borderRadius: '8px', background: 'rgba(232,101,74,0.1)', border: '1px solid rgba(232,101,74,0.3)', color: '#E8654A', cursor: 'pointer', fontWeight: 600 }}>Send Reminder</button>
              </div>
            ))}

            {/* Expiring packages */}
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#f5c842', marginBottom: '8px', marginTop: '20px', letterSpacing: '1px' }}>⏰ EXPIRING SOON</div>
            <div style={{ ...card, borderColor: 'rgba(245,200,66,0.2)' }}>
              <div style={{ fontSize: '14px', fontWeight: 700 }}>Anna Park — Gel Nails 10-Pack</div>
              <div style={{ fontSize: '12px', color: '#6b6b96' }}>2 sessions remaining · Expires in 30 days</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
