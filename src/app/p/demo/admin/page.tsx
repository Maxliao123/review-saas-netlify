'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

const DEMO_TOKEN = '3fd7ed1f3595a5b4cb8274fe0ac2d4a5';

type Tab = 'dashboard' | 'members' | 'verify' | 'bookings' | 'packages' | 'services' | 'products' | 'orders' | 'coupons' | 'points' | 'reviews' | 'sms' | 'revenue' | 'performance';

interface SidebarSection {
  title: string;
  items: { id: Tab; label: string; icon: string }[];
}

const SIDEBAR_SECTIONS: SidebarSection[] = [
  {
    title: 'OVERVIEW',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: 'grid' },
    ],
  },
  {
    title: 'STORE',
    items: [
      { id: 'products', label: 'Products', icon: 'box' },
      { id: 'orders', label: 'Orders', icon: 'receipt' },
      { id: 'coupons', label: 'Coupons', icon: 'tag' },
      { id: 'revenue', label: 'Revenue', icon: 'dollar' },
    ],
  },
  {
    title: 'MEMBERSHIP',
    items: [
      { id: 'members', label: 'Members', icon: 'users' },
      { id: 'bookings', label: 'Bookings', icon: 'calendar' },
      { id: 'verify', label: 'Check-in', icon: 'check' },
      { id: 'packages', label: 'Packages', icon: 'package' },
      { id: 'services', label: 'Services', icon: 'scissors' },
    ],
  },
  {
    title: 'ENGAGEMENT',
    items: [
      { id: 'points', label: 'Points', icon: 'star' },
      { id: 'reviews', label: 'Reviews', icon: 'message' },
      { id: 'sms', label: 'SMS Log', icon: 'phone' },
    ],
  },
  {
    title: 'ANALYTICS',
    items: [
      { id: 'performance', label: 'Performance', icon: 'chart' },
    ],
  },
];

// ─── Sidebar Icon Component ───
function SidebarIcon({ name, color }: { name: string; color: string }) {
  const s = { width: 18, height: 18, display: 'inline-block', verticalAlign: 'middle' };
  const svgProps = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: color, strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  switch (name) {
    case 'grid': return <svg {...svgProps} style={s}><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>;
    case 'box': return <svg {...svgProps} style={s}><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><path d="M3.27 6.96L12 12.01l8.73-5.05"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>;
    case 'receipt': return <svg {...svgProps} style={s}><path d="M4 2v20l3-2 3 2 3-2 3 2 3-2 3 2V2l-3 2-3-2-3 2-3-2-3 2-3-2z"/><line x1="8" y1="8" x2="16" y2="8"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="8" y1="16" x2="12" y2="16"/></svg>;
    case 'tag': return <svg {...svgProps} style={s}><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><circle cx="7" cy="7" r="1.5" fill={color}/></svg>;
    case 'dollar': return <svg {...svgProps} style={s}><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>;
    case 'users': return <svg {...svgProps} style={s}><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>;
    case 'calendar': return <svg {...svgProps} style={s}><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>;
    case 'check': return <svg {...svgProps} style={s}><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>;
    case 'package': return <svg {...svgProps} style={s}><path d="M16.5 9.4l-9-5.19"/><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><path d="M3.27 6.96L12 12.01l8.73-5.05"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>;
    case 'scissors': return <svg {...svgProps} style={s}><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><line x1="20" y1="4" x2="8.12" y2="15.88"/><line x1="14.47" y1="14.48" x2="20" y2="20"/><line x1="8.12" y1="8.12" x2="12" y2="12"/></svg>;
    case 'star': return <svg {...svgProps} style={s}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" fill="none"/></svg>;
    case 'message': return <svg {...svgProps} style={s}><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>;
    case 'phone': return <svg {...svgProps} style={s}><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>;
    case 'chart': return <svg {...svgProps} style={s}><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>;
    default: return <span style={s}>*</span>;
  }
}

// ─── Fake Data ───

const MEMBERS = [
  // Diamond VIP
  { name: 'Sophia Chen', phone: '+1 604-555-0201', status: 'active', tags: ['VIP','Diamond'], vip: '💎 Diamond', visits: 42, points: 1280, package: 'Gel Nails 10-Pack', remaining: 1, lastVisit: '2 days ago', birthday: 'Apr 22', email: 'sophia@example.com', totalSpent: 4860 },
  { name: '林雅婷', phone: '+1 604-555-0202', status: 'active', tags: ['VIP','Diamond'], vip: '💎 Diamond', visits: 35, points: 960, package: 'Gel Nails 10-Pack', remaining: 3, lastVisit: '5 days ago', birthday: 'Sep 15', email: 'yating@example.com', totalSpent: 3920 },
  // Gold VIP
  { name: 'Anna Park', phone: '+1 604-555-0105', status: 'active', tags: ['VIP','Gold'], vip: '🥇 Gold', visits: 18, points: 520, package: 'Gel Nails 10-Pack', remaining: 2, lastVisit: '1 day ago', birthday: 'Jun 15', email: 'anna@example.com', totalSpent: 2340 },
  { name: 'Rachel Kim', phone: '+1 604-555-0203', status: 'active', tags: ['VIP','Gold'], vip: '🥇 Gold', visits: 24, points: 620, package: 'Gel Nails 10-Pack', remaining: 5, lastVisit: '4 days ago', birthday: 'Dec 3', email: 'rachel@example.com', totalSpent: 2180 },
  { name: 'Olivia Nguyen', phone: '+1 604-555-0204', status: 'active', tags: ['VIP','Gold'], vip: '🥇 Gold', visits: 19, points: 480, package: 'Gel Nails 5-Pack', remaining: 2, lastVisit: '7 days ago', birthday: 'Jul 28', email: 'olivia@example.com', totalSpent: 1850 },
  { name: '陳美玲', phone: '+1 604-555-0205', status: 'active', tags: ['VIP','Gold'], vip: '🥇 Gold', visits: 16, points: 410, package: 'Gel Nails 10-Pack', remaining: 4, lastVisit: '12 days ago', birthday: 'Feb 14', email: '', totalSpent: 1620 },
  // Silver
  { name: 'Mary Johnson', phone: '+1 604-555-0101', status: 'active', tags: ['Silver'], vip: '🥈 Silver', visits: 12, points: 350, package: 'Gel Nails 10-Pack', remaining: 7, lastVisit: '3 days ago', birthday: 'Nov 22', email: 'mary@example.com', totalSpent: 1580 },
  { name: 'Hannah Lee', phone: '+1 604-555-0206', status: 'active', tags: ['Silver'], vip: '🥈 Silver', visits: 10, points: 220, package: 'Gel Nails 5-Pack', remaining: 3, lastVisit: '8 days ago', birthday: '', email: 'hannah@example.com', totalSpent: 780 },
  { name: '張心怡', phone: '+1 604-555-0207', status: 'active', tags: ['Silver'], vip: '🥈 Silver', visits: 8, points: 190, package: 'Gel Nails 5-Pack', remaining: 4, lastVisit: '15 days ago', birthday: 'Nov 20', email: '', totalSpent: 640 },
  { name: 'Mia Patel', phone: '+1 604-555-0208', status: 'active', tags: ['Silver'], vip: '🥈 Silver', visits: 7, points: 150, package: 'Store Credit $200', remaining: 120, lastVisit: '20 days ago', birthday: '', email: 'mia@example.com', totalSpent: 560 },
  // Regular
  { name: '王小美', phone: '+1 604-555-0102', status: 'active', tags: [], vip: 'Regular', visits: 7, points: 180, package: 'Gel Nails 5-Pack', remaining: 3, lastVisit: '10 days ago', birthday: 'Mar 8', email: 'xiaomei@example.com', totalSpent: 680 },
  { name: 'Isabella Wong', phone: '+1 604-555-0209', status: 'active', tags: [], vip: 'Regular', visits: 6, points: 130, package: '—', remaining: 0, lastVisit: '18 days ago', birthday: 'May 30', email: 'isabella@example.com', totalSpent: 390 },
  { name: 'Grace Liu', phone: '+1 604-555-0211', status: 'active', tags: [], vip: 'Regular', visits: 3, points: 80, package: '—', remaining: 0, lastVisit: '14 days ago', birthday: '', email: 'grace@example.com', totalSpent: 195 },
  // Dormant
  { name: 'Emily Zhang', phone: '+1 604-555-0103', status: 'active', tags: ['dormant_30d'], vip: 'Regular', visits: 3, points: 50, package: '—', remaining: 0, lastVisit: '45 days ago', birthday: 'Sep 3', email: 'emily@example.com', totalSpent: 195 },
  { name: 'Chloe Park', phone: '+1 604-555-0212', status: 'active', tags: ['dormant_30d'], vip: 'Regular', visits: 1, points: 30, package: '—', remaining: 0, lastVisit: '35 days ago', birthday: '', email: 'chloe@example.com', totalSpent: 65 },
  { name: 'Jessica Liu', phone: '+1 604-555-0104', status: 'inactive', tags: ['dormant_60d'], vip: 'Regular', visits: 1, points: 0, package: '—', remaining: 0, lastVisit: '90 days ago', birthday: 'Jan 19', email: '', totalSpent: 65 },
  { name: '王雅琪', phone: '+1 604-555-0213', status: 'inactive', tags: ['dormant_60d'], vip: 'Regular', visits: 1, points: 0, package: '—', remaining: 0, lastVisit: '60 days ago', birthday: '', email: '', totalSpent: 65 },
  // Churned
  { name: 'Natalie Tran', phone: '+1 604-555-0214', status: 'churned', tags: ['churned'], vip: '—', visits: 2, points: 0, package: '—', remaining: 0, lastVisit: '120 days ago', birthday: '', email: 'natalie@example.com', totalSpent: 130 },
  { name: '李佳穎', phone: '+1 604-555-0215', status: 'churned', tags: ['churned'], vip: '—', visits: 4, points: 20, package: '—', remaining: 0, lastVisit: '95 days ago', birthday: '', email: '', totalSpent: 260 },
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
  { name: 'Gel Nails 10-Pack', type: 'sessions', units: 10, price: 580, validDays: 365, members: 6 },
  { name: 'Gel Nails 5-Pack', type: 'sessions', units: 5, price: 300, validDays: 180, members: 4 },
  { name: 'Store Credit $200', type: 'amount', units: 200, price: 180, validDays: 365, members: 2 },
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
  { code: 'BDAY25', member: '王小美', date: 'Mar 8', order: '#1031', discount: '$16.25', original: '$65.00' },
  { code: 'WELCOME15', member: 'Emily Zhang', date: 'Mar 25', order: '#1027', discount: '$14.25', original: '$95.00' },
  { code: 'FREESHIP', member: 'Anna Park', date: 'Mar 20', order: '#1019', discount: '$12.00', original: '$85.00' },
  { code: 'SPRING20', member: '王小美', date: 'Mar 15', order: '#1012', discount: '$19.00', original: '$95.00' },
];

const POINTS_LOG = [
  { member: 'Anna Park', amount: '+50', type: 'Review reward', desc: 'Left 5-star Google review', date: 'Apr 3' },
  { member: 'Anna Park', amount: '+100', type: 'Referral', desc: 'Referred Emily Zhang', date: 'Mar 20' },
  { member: 'Anna Park', amount: '+100', type: 'Referral', desc: 'Referred Grace Liu', date: 'Mar 10' },
  { member: 'Anna Park', amount: '-30', type: 'Redeem', desc: 'Redeemed for $3 discount', date: 'Mar 15' },
  { member: 'Anna Park', amount: '+300', type: 'Purchase', desc: 'Purchased Gel Nails 10-Pack', date: 'Feb 10' },
  { member: 'Mary Johnson', amount: '+50', type: 'Review reward', desc: 'Left 4-star Google review', date: 'Apr 1' },
  { member: 'Mary Johnson', amount: '+300', type: 'Purchase', desc: 'Purchased Gel Nails 10-Pack', date: 'Mar 5' },
  { member: '王小美', amount: '+150', type: 'Purchase', desc: 'Purchased Gel Nails 5-Pack', date: 'Mar 12' },
  { member: '王小美', amount: '+30', type: 'Birthday bonus', desc: 'Birthday month double points (Mar)', date: 'Mar 8' },
  { member: 'Sophia Chen', amount: '+580', type: 'Purchase', desc: 'Purchased Gel Nails 10-Pack (2x)', date: 'Jan 5' },
  { member: 'Sophia Chen', amount: '+300', type: 'Purchase', desc: 'Purchased Store Credit $200', date: 'Feb 1' },
  { member: 'Sophia Chen', amount: '+100', type: 'Referral', desc: 'Referred Rachel Kim', date: 'Feb 15' },
  { member: 'Sophia Chen', amount: '+50', type: 'Review reward', desc: 'Left 5-star Google review', date: 'Mar 28' },
  { member: 'Sophia Chen', amount: '-50', type: 'Redeem', desc: 'Redeemed for $5 discount', date: 'Apr 1' },
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
  { date: 'Mon', amount: 325, bookings: 5 },
  { date: 'Tue', amount: 260, bookings: 4 },
  { date: 'Wed', amount: 455, bookings: 7 },
  { date: 'Thu', amount: 390, bookings: 6 },
  { date: 'Fri', amount: 520, bookings: 8 },
  { date: 'Sat', amount: 585, bookings: 9 },
  { date: 'Sun', amount: 0, bookings: 0 },
];

const STAFF_STATS = [
  { name: 'Lisa Chen', checkins: 68, rating: 4.8, commission: '$1,958', reviews: 8, topReview: 'Always perfect nails!' },
  { name: 'Amy Wang', checkins: 45, rating: 4.5, commission: '$1,260', reviews: 5, topReview: 'Very detailed work' },
  { name: 'Sarah Kim', checkins: 32, rating: 4.9, commission: '$720', reviews: 3, topReview: 'Best service ever!' },
];

const ADMIN_PRODUCTS = [
  { id: 1, name: 'Spring Bouquet DIY Kit', price: 68, stock: 24, status: 'active', image: 'https://images.unsplash.com/photo-1490750967868-88aa4f44baee?w=100&h=100&fit=crop' },
  { id: 2, name: 'Gel Nail Art Starter Set', price: 45, stock: 18, status: 'active', image: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=100&h=100&fit=crop' },
  { id: 3, name: 'Dried Flower Frame Kit', price: 55, stock: 32, status: 'active', image: 'https://images.unsplash.com/photo-1487530811176-3780de880c2d?w=100&h=100&fit=crop' },
  { id: 4, name: 'Premium Floral Scissors', price: 28, stock: 45, status: 'active', image: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=100&h=100&fit=crop' },
  { id: 5, name: 'Nail Drill Machine Pro', price: 120, stock: 8, status: 'active', image: 'https://images.unsplash.com/photo-1519014816548-bf5fe059798b?w=100&h=100&fit=crop' },
  { id: 6, name: 'Floral Foam Blocks (10pk)', price: 15, stock: 120, status: 'active', image: 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=100&h=100&fit=crop' },
  { id: 7, name: 'Holiday Wreath Workshop Kit', price: 88, stock: 0, status: 'draft', image: 'https://images.unsplash.com/photo-1490750967868-88aa4f44baee?w=100&h=100&fit=crop' },
  { id: 8, name: 'Chrome Nail Powder Set', price: 35, stock: 0, status: 'draft', image: 'https://images.unsplash.com/photo-1585128792020-803d29415281?w=100&h=100&fit=crop' },
];

const ORDERS = [
  { id: '#1042', customer: '王小美', date: 'Apr 2', items: 2, total: 120, status: 'paid' },
  { id: '#1038', customer: 'Anna Park', date: 'Apr 1', items: 1, total: 95, status: 'shipped' },
  { id: '#1031', customer: '王小美', date: 'Mar 28', items: 3, total: 178, status: 'delivered' },
  { id: '#1027', customer: 'Emily Zhang', date: 'Mar 25', items: 1, total: 95, status: 'delivered' },
  { id: '#1019', customer: 'Anna Park', date: 'Mar 20', items: 2, total: 153, status: 'delivered' },
  { id: '#1012', customer: 'Sophia Chen', date: 'Mar 15', items: 1, total: 95, status: 'refunded' },
];

// ─── Recent Activity for Dashboard ───
const RECENT_ACTIVITY = [
  { type: 'booking', icon: '📅', text: 'Anna Park booked Gel Manicure with Lisa', time: '2 hours ago', color: '#3b82f6' },
  { type: 'review', icon: '⭐', text: 'Anna Park left a 5-star Google review', time: '5 hours ago', color: '#f5c842' },
  { type: 'purchase', icon: '💰', text: '王小美 purchased 2 items ($120)', time: '1 day ago', color: '#22c55e' },
  { type: 'sms', icon: '📱', text: 'SMS reminder sent to Mary Johnson', time: '1 day ago', color: '#8b5cf6' },
  { type: 'alert', icon: '⚠️', text: 'Jessica Liu SMS delivery failed', time: '5 days ago', color: '#ef4444' },
];

// ─── Component ───

export default function AdminDemoPage() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [verifyCode, setVerifyCode] = useState('');
  const [verifyResult, setVerifyResult] = useState<'idle' | 'success' | 'error'>('idle');
  const [memberSearch, setMemberSearch] = useState('');
  const [couponFilter, setCouponFilter] = useState<'all' | 'active' | 'expired'>('all');
  const [smsFilter, setSmsFilter] = useState<'all' | 'delivered' | 'failed'>('all');
  const [showCouponUsage, setShowCouponUsage] = useState(false);
  const [isDark, setIsDark] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [hoveredBar, setHoveredBar] = useState<number | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(t);
  }, []);

  // Reset animation on tab change
  useEffect(() => {
    setMounted(false);
    const t = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(t);
  }, [activeTab]);

  function handleVerify() {
    if (verifyCode === '483291') setVerifyResult('success');
    else if (verifyCode.length === 6) setVerifyResult('error');
  }

  const filteredMembers = MEMBERS.filter(m => m.name.toLowerCase().includes(memberSearch.toLowerCase()) || m.phone.includes(memberSearch));
  const filteredCoupons = COUPONS.filter(c => couponFilter === 'all' || c.status === couponFilter);
  const filteredSms = SMS_LOG.filter(s => smsFilter === 'all' || s.status === smsFilter);
  const maxRevenue = Math.max(...REVENUE_DAILY.map(d => d.amount));

  // ─── Theme ───
  const t = {
    bg: isDark ? '#07070d' : '#f8f9fa',
    sidebar: isDark ? '#0a0a14' : '#ffffff',
    card: isDark ? '#0f0f1a' : '#ffffff',
    cardBorder: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)',
    text: isDark ? '#ededf5' : '#1a1a2e',
    textSecondary: isDark ? '#9898b8' : '#6b7280',
    textMuted: isDark ? '#6b6b96' : '#9ca3af',
    border: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)',
    inputBg: isDark ? '#0f0f1a' : '#f3f4f6',
    inputBorder: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.12)',
    sidebarActive: 'rgba(232,101,74,0.08)',
    sidebarHover: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)',
  };

  const card: React.CSSProperties = { background: t.card, border: `1px solid ${t.cardBorder}`, borderRadius: '12px', padding: '16px' };
  const badge = (color: string) => ({ display: 'inline-block', padding: '2px 8px', borderRadius: '99px', fontSize: '10px', fontWeight: 700 as const, background: color + '18', color, border: `1px solid ${color}40` });
  const filterBtn = (active: boolean) => ({ padding: '6px 14px', borderRadius: '8px', border: 'none', cursor: 'pointer' as const, fontSize: '11px', fontWeight: 600 as const, background: active ? '#E8654A20' : 'transparent', color: active ? '#E8654A' : t.textMuted });

  // ─── Dashboard Stat Cards ───
  const statCards = [
    { label: 'Revenue', value: '$7,280', change: '+12%', up: true, gradient: 'linear-gradient(135deg, #E8654A, #f5c842)' },
    { label: 'Members', value: '16', sub: 'active', change: '+3', up: true, gradient: 'linear-gradient(135deg, #3b82f6, #8b5cf6)' },
    { label: 'Bookings', value: '39', sub: '/wk', change: '+8%', up: true, gradient: 'linear-gradient(135deg, #22c55e, #3b82f6)' },
    { label: 'Rating', value: '4.7', sub: '\u2605', change: '+0.2', up: true, gradient: 'linear-gradient(135deg, #f5c842, #E8654A)' },
  ];

  // Member tier data for donut
  const tiers = [
    { label: 'Diamond', count: 2, pct: 10, color: '#8b5cf6' },
    { label: 'Gold', count: 4, pct: 20, color: '#f5c842' },
    { label: 'Silver', count: 4, pct: 20, color: '#9898b8' },
    { label: 'Regular', count: 6, pct: 30, color: '#3b82f6' },
    { label: 'Dormant/Churned', count: 4, pct: 20, color: '#ef4444' },
  ];

  // Build conic gradient string
  let conicStops = '';
  let cumPct = 0;
  tiers.forEach((tier) => {
    conicStops += `${tier.color} ${cumPct}% ${cumPct + tier.pct}%, `;
    cumPct += tier.pct;
  });
  conicStops = conicStops.slice(0, -2);
  const donutGradient = `conic-gradient(${conicStops})`;

  return (
    <div style={{ background: t.bg, color: t.text, minHeight: '100vh', fontFamily: "'Inter', -apple-system, sans-serif", display: 'flex', position: 'relative' }}>

      {/* ═══ MOBILE OVERLAY ═══ */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 90 }}
        />
      )}

      {/* ═══ SIDEBAR ═══ */}
      <aside style={{
        width: 220,
        minWidth: 220,
        background: t.sidebar,
        borderRight: `1px solid ${t.border}`,
        display: 'flex',
        flexDirection: 'column',
        position: 'fixed',
        top: 0,
        left: sidebarOpen ? 0 : undefined,
        bottom: 0,
        zIndex: 100,
        transition: 'transform 0.25s ease',
        transform: typeof window !== 'undefined' && window.innerWidth < 768 ? (sidebarOpen ? 'translateX(0)' : 'translateX(-100%)') : undefined,
        overflowY: 'auto',
      }}>
        {/* Logo */}
        <div style={{ padding: '20px 16px 12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: 36, height: 36, borderRadius: '50%',
            background: 'linear-gradient(135deg, #E8654A, #f5c842)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '16px', fontWeight: 900, color: '#fff',
            flexShrink: 0,
          }}>L</div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 800, color: t.text, lineHeight: 1.2 }}>Lush Nail Studio</div>
            <div style={{
              fontSize: '9px', fontWeight: 700, color: '#E8654A',
              background: 'rgba(232,101,74,0.1)', border: '1px solid rgba(232,101,74,0.3)',
              padding: '1px 6px', borderRadius: '99px', display: 'inline-block', marginTop: '2px',
            }}>DEMO</div>
          </div>
        </div>

        {/* Nav sections */}
        <nav style={{ flex: 1, padding: '8px 0' }}>
          {SIDEBAR_SECTIONS.map((section) => (
            <div key={section.title} style={{ marginBottom: '4px' }}>
              <div style={{
                fontSize: '10px', fontWeight: 700, color: t.textMuted,
                letterSpacing: '1.2px', padding: '12px 16px 4px',
                textTransform: 'uppercase',
              }}>{section.title}</div>
              {section.items.map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => { setActiveTab(item.id); setVerifyResult('idle'); setVerifyCode(''); setSidebarOpen(false); }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '10px',
                      width: '100%', padding: '9px 16px', border: 'none',
                      background: isActive ? t.sidebarActive : 'transparent',
                      borderLeft: isActive ? '3px solid #E8654A' : '3px solid transparent',
                      cursor: 'pointer', fontSize: '13px', fontWeight: isActive ? 600 : 400,
                      color: isActive ? '#E8654A' : (isDark ? '#b0b0cc' : '#4b5563'),
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = t.sidebarHover; }}
                    onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
                  >
                    <SidebarIcon name={item.icon} color={isActive ? '#E8654A' : (isDark ? '#6b6b96' : '#9ca3af')} />
                    {item.label}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Sidebar bottom */}
        <div style={{ padding: '12px 16px', borderTop: `1px solid ${t.border}`, display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {/* Theme toggle */}
          <button
            onClick={() => setIsDark(!isDark)}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '8px 12px', borderRadius: '8px', border: 'none',
              background: 'transparent', cursor: 'pointer',
              fontSize: '12px', color: t.textMuted,
            }}
          >
            <span style={{ fontSize: '16px' }}>{isDark ? '\u2600\uFE0F' : '\uD83C\uDF19'}</span>
            {isDark ? 'Light Mode' : 'Dark Mode'}
          </button>
          {/* Member View */}
          <Link href={`/m/${DEMO_TOKEN}`} style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '8px 12px', borderRadius: '8px', textDecoration: 'none',
            fontSize: '12px', color: '#8b5cf6',
          }}>
            <span style={{ fontSize: '14px' }}>👤</span> Member View →
          </Link>
          {/* Quote */}
          <Link href="/p/quote" style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '8px 12px', borderRadius: '8px', textDecoration: 'none',
            fontSize: '12px', color: t.textMuted,
          }}>
            <span style={{ fontSize: '14px' }}>💬</span> Quote →
          </Link>
        </div>
      </aside>

      {/* ═══ MAIN CONTENT ═══ */}
      <main style={{ flex: 1, marginLeft: 220, minHeight: '100vh' }}>

        {/* Mobile hamburger */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          style={{
            display: 'none',
            position: 'fixed', top: 12, left: 12, zIndex: 80,
            width: 40, height: 40, borderRadius: '10px',
            background: isDark ? 'rgba(15,15,26,0.95)' : 'rgba(255,255,255,0.95)',
            border: `1px solid ${t.border}`, cursor: 'pointer',
            fontSize: '20px', alignItems: 'center', justifyContent: 'center',
            color: t.text, backdropFilter: 'blur(10px)',
          }}
          className="mobile-hamburger"
        >
          {sidebarOpen ? '\u2715' : '\u2630'}
        </button>

        <div style={{ padding: '24px', maxWidth: '1200px' }}>

          {/* ═══ DASHBOARD ═══ */}
          {activeTab === 'dashboard' && (
            <div>
              <div style={{ marginBottom: '24px' }}>
                <h2 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '4px' }}>Dashboard</h2>
                <div style={{ fontSize: '13px', color: t.textMuted }}>Welcome back. Here&apos;s what&apos;s happening today.</div>
              </div>

              {/* Stat cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '28px' }}>
                {statCards.map((s, i) => (
                  <div key={s.label} style={{
                    background: isDark
                      ? 'linear-gradient(135deg, rgba(15,15,26,0.9), rgba(20,20,35,0.9))'
                      : 'linear-gradient(135deg, rgba(255,255,255,0.95), rgba(248,249,250,0.95))',
                    border: `1px solid ${t.cardBorder}`,
                    borderRadius: '16px', padding: '20px',
                    opacity: mounted ? 1 : 0,
                    transform: mounted ? 'translateY(0)' : 'translateY(10px)',
                    transition: `opacity 0.5s ease ${i * 0.1}s, transform 0.5s ease ${i * 0.1}s`,
                  }}>
                    <div style={{ fontSize: '12px', color: t.textMuted, marginBottom: '8px', fontWeight: 500 }}>{s.label}</div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                      <span style={{
                        fontSize: '28px', fontWeight: 900,
                        background: s.gradient,
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                        lineHeight: 1,
                      }}>{s.value}</span>
                      {s.sub && <span style={{ fontSize: '14px', color: t.textMuted }}>{s.sub}</span>}
                    </div>
                    <div style={{
                      fontSize: '11px', fontWeight: 600, marginTop: '8px',
                      color: s.up ? '#22c55e' : '#ef4444',
                      display: 'flex', alignItems: 'center', gap: '3px',
                    }}>
                      <span>{s.up ? '\u25B2' : '\u25BC'}</span> {s.change}
                      <span style={{ color: t.textMuted, fontWeight: 400, marginLeft: '4px' }}>vs last month</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Revenue chart + Donut */}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px', marginBottom: '28px' }}>
                {/* Revenue bar chart */}
                <div style={{ ...card, padding: '20px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: t.textMuted, marginBottom: '16px', letterSpacing: '0.5px' }}>WEEKLY REVENUE</div>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', height: '180px', position: 'relative' }}>
                    {/* Y-axis labels */}
                    <div style={{ position: 'absolute', left: 0, top: 0, bottom: 24, width: '40px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                      {[600, 400, 200, 0].map(v => (
                        <div key={v} style={{ fontSize: '9px', color: t.textMuted, textAlign: 'right', paddingRight: '8px' }}>${v}</div>
                      ))}
                    </div>
                    <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', gap: '8px', marginLeft: '44px', height: '100%', paddingBottom: '24px', position: 'relative' }}>
                      {REVENUE_DAILY.map((d, i) => {
                        const barHeight = d.amount > 0 ? (d.amount / 600) * 140 : 4;
                        return (
                          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', position: 'relative' }}
                            onMouseEnter={() => setHoveredBar(i)}
                            onMouseLeave={() => setHoveredBar(null)}
                          >
                            {/* Tooltip */}
                            {hoveredBar === i && d.amount > 0 && (
                              <div style={{
                                position: 'absolute', bottom: `${barHeight + 32}px`,
                                background: isDark ? '#1a1a2e' : '#fff',
                                border: `1px solid ${t.cardBorder}`,
                                borderRadius: '8px', padding: '6px 10px',
                                fontSize: '11px', fontWeight: 600, color: t.text,
                                whiteSpace: 'nowrap', zIndex: 10,
                                boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                              }}>
                                ${d.amount} &middot; {d.bookings} bookings
                              </div>
                            )}
                            <div style={{
                              width: '100%', maxWidth: '48px',
                              borderRadius: '6px 6px 0 0',
                              background: d.amount > 0 ? 'linear-gradient(to top, #E8654A, #f5c842)' : (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'),
                              height: mounted ? `${barHeight}px` : '0px',
                              transition: `height 0.8s ease-out ${i * 0.1}s`,
                              cursor: d.amount > 0 ? 'pointer' : 'default',
                            }} />
                            <div style={{ fontSize: '11px', color: t.textMuted, fontWeight: 500, position: 'absolute', bottom: 0 }}>{d.date}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Member tier donut */}
                <div style={{ ...card, padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: t.textMuted, marginBottom: '16px', letterSpacing: '0.5px', alignSelf: 'flex-start' }}>MEMBER TIERS</div>
                  <div style={{
                    width: 140, height: 140, borderRadius: '50%',
                    background: donutGradient,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    position: 'relative',
                  }}>
                    <div style={{
                      width: 80, height: 80, borderRadius: '50%',
                      background: t.card,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexDirection: 'column',
                    }}>
                      <div style={{ fontSize: '20px', fontWeight: 900, color: t.text }}>20</div>
                      <div style={{ fontSize: '9px', color: t.textMuted }}>total</div>
                    </div>
                  </div>
                  {/* Legend */}
                  <div style={{ marginTop: '16px', display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center' }}>
                    {tiers.map(tier => (
                      <div key={tier.label} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', color: t.textSecondary }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: tier.color, flexShrink: 0 }} />
                        {tier.label} ({tier.count})
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Recent activity */}
              <div style={{ ...card, padding: '20px' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: t.textMuted, marginBottom: '14px', letterSpacing: '0.5px' }}>RECENT ACTIVITY</div>
                {RECENT_ACTIVITY.map((a, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: '12px',
                    padding: '10px 0',
                    borderBottom: i < RECENT_ACTIVITY.length - 1 ? `1px solid ${t.border}` : 'none',
                  }}>
                    <div style={{
                      borderLeft: `3px solid ${a.color}`,
                      paddingLeft: '10px',
                      flex: 1,
                    }}>
                      <div style={{ fontSize: '13px', fontWeight: 500, color: t.text }}>
                        <span style={{ marginRight: '6px' }}>{a.icon}</span>{a.text}
                      </div>
                      <div style={{ fontSize: '11px', color: t.textMuted, marginTop: '2px' }}>{a.time}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ═══ MEMBERS ═══ */}
          {activeTab === 'members' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 800 }}>Members ({MEMBERS.length})</h2>
                <button style={{ ...badge('#22c55e'), padding: '6px 12px', cursor: 'pointer', border: 'none' }}>+ Add</button>
              </div>
              <input value={memberSearch} onChange={e => setMemberSearch(e.target.value)} placeholder="Search name or phone..." style={{ width: '100%', padding: '10px 14px', background: t.inputBg, border: `1px solid ${t.inputBorder}`, borderRadius: '10px', color: t.text, fontSize: '13px', marginBottom: '12px', outline: 'none' }} />
              {filteredMembers.map((m, i) => (
                <div key={i} style={{ ...card, marginBottom: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {m.name}
                        {m.vip !== 'Regular' && m.vip !== '—' && <span style={badge(m.vip.includes('Diamond') ? '#8b5cf6' : m.vip.includes('Gold') ? '#f5c842' : '#9898b8')}>{m.vip}</span>}
                        {m.tags.includes('dormant_30d') && <span style={badge('#ef4444')}>30d dormant</span>}
                        {m.tags.includes('dormant_60d') && <span style={badge('#ef4444')}>60d+</span>}
                      </div>
                      <div style={{ fontSize: '11px', color: t.textMuted, marginTop: '2px' }}>{m.phone} · {m.visits} visits · Last: {m.lastVisit}</div>
                      <div style={{ fontSize: '10px', color: t.textMuted, marginTop: '1px' }}>🎂 {m.birthday} · Total spent: ${m.totalSpent}</div>
                    </div>
                    <div style={{ textAlign: 'right' as const }}>
                      <div style={{ fontSize: '12px', color: '#E8654A', fontWeight: 700 }}>{m.remaining > 0 ? `${m.remaining} left` : '—'}</div>
                      <div style={{ fontSize: '10px', color: t.textMuted }}>{m.package}</div>
                      <div style={{ fontSize: '10px', color: '#f5c842' }}>⭐ {m.points} pts</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                    <button style={{ fontSize: '10px', padding: '4px 10px', borderRadius: '6px', background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.3)', color: '#8b5cf6', cursor: 'pointer' }}>📱 Send Link</button>
                    <button style={{ fontSize: '10px', padding: '4px 10px', borderRadius: '6px', background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', border: `1px solid ${t.inputBorder}`, color: t.textSecondary, cursor: 'pointer' }}>📝 Note</button>
                    <button style={{ fontSize: '10px', padding: '4px 10px', borderRadius: '6px', background: 'rgba(245,200,66,0.1)', border: '1px solid rgba(245,200,66,0.3)', color: '#f5c842', cursor: 'pointer' }}>🎫 Add Package</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ═══ VERIFY ═══ */}
          {activeTab === 'verify' && (
            <div style={{ textAlign: 'center', paddingTop: '32px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '8px' }}>Check-in</h2>
              <p style={{ fontSize: '13px', color: t.textMuted, marginBottom: '24px' }}>Enter the 6-digit code from customer</p>
              <input value={verifyCode} onChange={e => { setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6)); setVerifyResult('idle'); }} placeholder="000000" maxLength={6} autoFocus style={{ fontSize: '48px', fontWeight: 900, fontFamily: 'monospace', letterSpacing: '12px', textAlign: 'center', width: '280px', padding: '16px', background: t.inputBg, border: verifyResult === 'error' ? '2px solid #ef4444' : `2px solid ${t.inputBorder}`, borderRadius: '16px', color: t.text, outline: 'none' }} />
              {verifyCode.length === 6 && verifyResult === 'idle' && (
                <div style={{ marginTop: '24px' }}>
                  <div style={{ ...card, maxWidth: '320px', margin: '0 auto 16px', textAlign: 'left' as const }}>
                    <div style={{ fontSize: '14px', fontWeight: 700 }}>Anna Park <span style={badge('#f5c842')}>Gold VIP</span></div>
                    <div style={{ fontSize: '12px', color: t.textMuted, marginTop: '4px' }}>Gel Manicure · Lisa Chen · Tomorrow 3:00 PM</div>
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
                  <div style={{ fontSize: '14px', color: t.textSecondary, marginTop: '8px' }}>Anna Park · Gel Manicure · Lisa Chen</div>
                  <div style={{ fontSize: '24px', fontWeight: 900, color: '#f5c842', marginTop: '8px' }}>1 session remaining</div>
                  <div style={{ fontSize: '12px', color: t.textMuted, marginTop: '4px' }}>+50 points earned · SMS feedback invite in 2 hours</div>
                  <button onClick={() => { setVerifyCode(''); setVerifyResult('idle'); }} style={{ marginTop: '20px', fontSize: '13px', padding: '10px 24px', borderRadius: '10px', border: `1px solid ${t.inputBorder}`, background: 'transparent', color: t.textSecondary, cursor: 'pointer' }}>Next check-in</button>
                </div>
              )}
              {verifyResult === 'error' && (
                <div style={{ marginTop: '24px' }}>
                  <div style={{ fontSize: '48px' }}>❌</div>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: '#ef4444', marginTop: '8px' }}>Invalid code</div>
                  <p style={{ fontSize: '12px', color: t.textMuted, marginTop: '4px' }}>Try: 483291</p>
                  <button onClick={() => { setVerifyCode(''); setVerifyResult('idle'); }} style={{ marginTop: '12px', fontSize: '12px', padding: '8px 20px', borderRadius: '8px', border: `1px solid ${t.inputBorder}`, background: 'transparent', color: t.textSecondary, cursor: 'pointer' }}>Try again</button>
                </div>
              )}
            </div>
          )}

          {/* ═══ BOOKINGS ═══ */}
          {activeTab === 'bookings' && (
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '12px' }}>Bookings</h2>
              {BOOKINGS.map(b => (
                <div key={b.id} style={{ ...card, marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 700 }}>{b.member}</div>
                    <div style={{ fontSize: '12px', color: t.textMuted }}>{b.service} · {b.staff}</div>
                    <div style={{ fontSize: '11px', color: t.textSecondary }}>{b.time}</div>
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
                <h2 style={{ fontSize: '18px', fontWeight: 800 }}>Packages</h2>
                <button style={{ ...badge('#22c55e'), padding: '6px 12px', cursor: 'pointer', border: 'none' }}>+ Create</button>
              </div>
              {PACKAGES.map((p, i) => (
                <div key={i} style={{ ...card, marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 700 }}>{p.name}</div>
                    <div style={{ fontSize: '12px', color: t.textMuted }}>{p.type} · {p.units} units · Valid {p.validDays} days</div>
                  </div>
                  <div style={{ textAlign: 'right' as const }}>
                    <div style={{ fontSize: '16px', fontWeight: 900, color: '#f5c842' }}>${p.price}</div>
                    <div style={{ fontSize: '10px', color: t.textMuted }}>{p.members} active</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ═══ SERVICES ═══ */}
          {activeTab === 'services' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 800 }}>Services</h2>
                <button style={{ ...badge('#22c55e'), padding: '6px 12px', cursor: 'pointer', border: 'none' }}>+ Add</button>
              </div>
              <div style={{ fontSize: '11px', color: t.textMuted, marginBottom: '12px' }}>🕐 Mon–Fri 9AM–6PM · Sat 10AM–5PM · Sun Closed</div>
              {SERVICES.map((s, i) => (
                <div key={i} style={{ ...card, marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 700 }}>{s.name}</div>
                    <div style={{ fontSize: '12px', color: t.textMuted }}>{s.duration} min · {s.credits} credit{s.credits > 1 ? 's' : ''} · {s.category}</div>
                  </div>
                  <div style={{ textAlign: 'right' as const }}>
                    <div style={{ fontSize: '16px', fontWeight: 800 }}>${s.price}</div>
                    <span style={badge('#22c55e')}>Active</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ═══ PRODUCTS ═══ */}
          {activeTab === 'products' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 800 }}>Products ({ADMIN_PRODUCTS.length})</h2>
                <Link href="/p/demo/products" style={{ fontSize: '12px', color: '#E8654A', textDecoration: 'none', fontWeight: 600 }}>Open full view →</Link>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${t.border}` }}>
                      {['Image', 'Product', 'Price', 'Stock', 'Status'].map(h => (
                        <th key={h} style={{ textAlign: 'left', padding: '8px 12px', fontSize: '10px', color: t.textMuted, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '1px' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {ADMIN_PRODUCTS.map(p => (
                      <tr key={p.id} style={{ borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'}` }}>
                        <td style={{ padding: '10px 12px' }}>
                          <img src={p.image} alt={p.name} style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover' }} />
                        </td>
                        <td style={{ padding: '10px 12px', fontSize: '13px', fontWeight: 600 }}>{p.name}</td>
                        <td style={{ padding: '10px 12px', fontSize: '13px', fontWeight: 600 }}>${p.price}</td>
                        <td style={{ padding: '10px 12px', fontSize: '13px', color: p.stock === 0 ? '#ef4444' : p.stock < 10 ? '#f5c842' : t.textMuted }}>{p.stock === 0 ? 'Out' : p.stock}</td>
                        <td style={{ padding: '10px 12px' }}>
                          <span style={badge(p.status === 'active' ? '#22c55e' : '#6b6b96')}>{p.status === 'active' ? 'Active' : 'Draft'}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ textAlign: 'center', marginTop: '16px' }}>
                <Link href="/p/demo/products" style={{ display: 'inline-block', padding: '10px 24px', borderRadius: '10px', background: '#E8654A', color: '#fff', textDecoration: 'none', fontSize: '13px', fontWeight: 700 }}>Open full view →</Link>
              </div>
            </div>
          )}

          {/* ═══ ORDERS ═══ */}
          {activeTab === 'orders' && (
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '4px' }}>Orders</h2>
              <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', fontSize: '12px', color: t.textMuted }}>
                <span>Total: {ORDERS.length}</span>
                <span>·</span>
                <span>Revenue: ${ORDERS.reduce((s, o) => s + o.total, 0)}</span>
              </div>
              {ORDERS.map((o, i) => (
                <div key={i} style={{ ...card, marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 700 }}>{o.id} <span style={{ fontWeight: 400, color: t.textSecondary }}>· {o.customer}</span></div>
                    <div style={{ fontSize: '11px', color: t.textMuted }}>{o.date} · {o.items} item{o.items > 1 ? 's' : ''}</div>
                  </div>
                  <div style={{ textAlign: 'right' as const }}>
                    <div style={{ fontSize: '16px', fontWeight: 900, color: o.status === 'refunded' ? '#ef4444' : '#22c55e' }}>${o.total}</div>
                    <span style={badge(
                      o.status === 'paid' ? '#22c55e' :
                      o.status === 'shipped' ? '#3b82f6' :
                      o.status === 'delivered' ? '#6b6b96' :
                      '#ef4444'
                    )}>{o.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ═══ COUPONS ═══ */}
          {activeTab === 'coupons' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 800 }}>Coupons</h2>
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
                          <div style={{ fontSize: '12px', color: t.textSecondary, marginTop: '4px' }}>{c.description}</div>
                          <div style={{ fontSize: '11px', color: t.textMuted, marginTop: '2px' }}>
                            {c.type === 'percent' ? `${c.value}% off` : c.type === 'fixed' ? `$${c.value} off` : 'Free shipping'}
                            {c.minSpend > 0 ? ` · Min $${c.minSpend}` : ''}
                            {' · '}{c.validFrom} to {c.validTo}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' as const }}>
                          <div style={{ fontSize: '20px', fontWeight: 900, color: c.type === 'percent' ? '#E8654A' : '#22c55e' }}>
                            {c.type === 'percent' ? `${c.value}%` : c.type === 'fixed' ? `$${c.value}` : 'Free'}
                          </div>
                          <div style={{ fontSize: '10px', color: t.textMuted }}>{c.used}/{c.maxUses} used</div>
                          <div style={{ width: '60px', height: '4px', background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)', borderRadius: '2px', marginTop: '4px' }}>
                            <div style={{ width: `${(c.used / c.maxUses) * 100}%`, height: '100%', background: c.used >= c.maxUses ? '#ef4444' : '#22c55e', borderRadius: '2px' }} />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </>
              ) : (
                <>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: t.textMuted, marginBottom: '8px' }}>RECENT USAGE</div>
                  {COUPON_USAGE.map((u, i) => (
                    <div key={i} style={{ ...card, marginBottom: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px' }}>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 600 }}>{u.member} · <span style={{ fontFamily: 'monospace', color: '#f5c842' }}>{u.code}</span></div>
                        <div style={{ fontSize: '11px', color: t.textMuted }}>{u.date} · Order {u.order}</div>
                      </div>
                      <div style={{ textAlign: 'right' as const }}>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: '#22c55e' }}>-{u.discount}</div>
                        <div style={{ fontSize: '10px', color: t.textMuted }}>from {u.original}</div>
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
              <h2 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '4px' }}>Points Transactions</h2>
              <div style={{ fontSize: '12px', color: t.textMuted, marginBottom: '16px' }}>1 point = CAD $0.01 · Review = 50 pts · Referral = 100 pts · Purchase = varies</div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '16px' }}>
                <div style={{ ...card, textAlign: 'center' as const, padding: '10px' }}>
                  <div style={{ fontSize: '18px', fontWeight: 900, color: '#22c55e' }}>1,100</div>
                  <div style={{ fontSize: '10px', color: t.textMuted }}>Total Issued</div>
                </div>
                <div style={{ ...card, textAlign: 'center' as const, padding: '10px' }}>
                  <div style={{ fontSize: '18px', fontWeight: 900, color: '#ef4444' }}>30</div>
                  <div style={{ fontSize: '10px', color: t.textMuted }}>Redeemed</div>
                </div>
                <div style={{ ...card, textAlign: 'center' as const, padding: '10px' }}>
                  <div style={{ fontSize: '18px', fontWeight: 900, color: '#f5c842' }}>1,070</div>
                  <div style={{ fontSize: '10px', color: t.textMuted }}>Outstanding</div>
                </div>
              </div>

              {POINTS_LOG.map((p, i) => (
                <div key={i} style={{ ...card, marginBottom: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px' }}>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600 }}>{p.member}</div>
                    <div style={{ fontSize: '11px', color: t.textMuted }}>{p.desc}</div>
                    <div style={{ fontSize: '10px', color: t.textMuted }}>{p.date} · {p.type}</div>
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: 900, color: p.amount.startsWith('+') ? '#22c55e' : '#ef4444' }}>{p.amount}</div>
                </div>
              ))}
            </div>
          )}

          {/* ═══ REVIEWS ═══ */}
          {activeTab === 'reviews' && (
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '4px' }}>Reviews</h2>
              <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', fontSize: '13px' }}>
                <span>⭐ 4.7 avg</span>
                <span style={{ color: t.textMuted }}>·</span>
                <span>{REVIEWS.filter(r => r.source === 'Google').length} Google</span>
                <span style={{ color: t.textMuted }}>·</span>
                <span>{REVIEWS.filter(r => r.status === 'internal').length} Internal</span>
              </div>
              {REVIEWS.map((r, i) => (
                <div key={i} style={{ ...card, marginBottom: '8px', borderColor: r.status === 'internal' ? 'rgba(239,68,68,0.2)' : undefined }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                    <div>
                      <span style={{ fontSize: '13px', fontWeight: 700 }}>{r.member}</span>
                      <span style={{ fontSize: '11px', color: t.textMuted, marginLeft: '8px' }}>→ {r.staff} · {r.date}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={badge(r.source === 'Google' ? '#3b82f6' : '#ef4444')}>{r.source}</span>
                      <span style={{ color: '#f5c842', fontSize: '12px' }}>{'⭐'.repeat(r.rating)}</span>
                    </div>
                  </div>
                  <div style={{ fontSize: '13px', color: t.textSecondary, marginBottom: r.aiReply ? '8px' : '0' }}>&ldquo;{r.text}&rdquo;</div>
                  {r.aiReply && (
                    <div style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.15)', borderRadius: '8px', padding: '8px 12px', marginTop: '6px' }}>
                      <div style={{ fontSize: '10px', color: '#22c55e', fontWeight: 700, marginBottom: '2px' }}>🤖 AI Reply (auto-published)</div>
                      <div style={{ fontSize: '12px', color: t.textSecondary }}>{r.aiReply}</div>
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
              <h2 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '4px' }}>SMS Log</h2>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', fontSize: '12px', color: t.textMuted }}>
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
                    <div style={{ fontSize: '13px', fontWeight: 600 }}>{s.to} <span style={{ color: t.textMuted, fontWeight: 400, fontSize: '11px' }}>{s.phone}</span></div>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <span style={badge(s.type.includes('Reminder') || s.type.includes('Confirm') ? '#3b82f6' : s.type.includes('Feedback') ? '#22c55e' : s.type.includes('Dormant') ? '#ef4444' : s.type.includes('Birthday') ? '#8b5cf6' : '#f5c842')}>{s.type}</span>
                      <span style={badge(s.status === 'delivered' ? '#22c55e' : '#ef4444')}>{s.status}</span>
                    </div>
                  </div>
                  <div style={{ fontSize: '12px', color: t.textSecondary }}>{s.message}</div>
                  <div style={{ fontSize: '10px', color: t.textMuted, marginTop: '4px' }}>{s.date}</div>
                </div>
              ))}
            </div>
          )}

          {/* ═══ REVENUE ═══ */}
          {activeTab === 'revenue' && (
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '16px' }}>Revenue</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '20px' }}>
                <div style={{ ...card, textAlign: 'center' as const, padding: '12px' }}>
                  <div style={{ fontSize: '22px', fontWeight: 900, color: '#22c55e' }}>$2,535</div>
                  <div style={{ fontSize: '10px', color: t.textMuted }}>This Week</div>
                </div>
                <div style={{ ...card, textAlign: 'center' as const, padding: '12px' }}>
                  <div style={{ fontSize: '22px', fontWeight: 900, color: '#3b82f6' }}>$7,280</div>
                  <div style={{ fontSize: '10px', color: t.textMuted }}>This Month</div>
                </div>
                <div style={{ ...card, textAlign: 'center' as const, padding: '12px' }}>
                  <div style={{ fontSize: '22px', fontWeight: 900, color: '#f5c842' }}>39</div>
                  <div style={{ fontSize: '10px', color: t.textMuted }}>Bookings/Wk</div>
                </div>
              </div>

              <div style={{ fontSize: '11px', fontWeight: 700, color: t.textMuted, marginBottom: '8px', letterSpacing: '1px' }}>DAILY REVENUE (THIS WEEK)</div>
              <div style={{ ...card, marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px', height: '120px' }}>
                  {REVENUE_DAILY.map((d, i) => (
                    <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                      <div style={{ fontSize: '10px', color: t.textSecondary, fontWeight: 600 }}>${d.amount}</div>
                      <div style={{ width: '100%', background: d.amount > 0 ? (d.date === 'Sat' ? '#f5c842' : '#E8654A') : (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'), borderRadius: '4px 4px 0 0', height: `${d.amount > 0 ? (d.amount / maxRevenue) * 80 : 4}px`, transition: 'height 0.3s' }} />
                      <div style={{ fontSize: '10px', color: t.textMuted }}>{d.date}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ fontSize: '11px', fontWeight: 700, color: t.textMuted, marginBottom: '8px', letterSpacing: '1px' }}>TOP SERVICES</div>
              {[{ name: 'Gel Manicure', rev: '$2,600', pct: 36, bookings: 40 }, { name: 'Nail Art Design', rev: '$1,900', pct: 26, bookings: 20 }, { name: 'Eyelash Extensions', rev: '$1,200', pct: 16, bookings: 10 }, { name: 'Gel Pedicure', rev: '$975', pct: 13, bookings: 13 }, { name: 'Removal + Redo', rev: '$605', pct: 9, bookings: 7 }].map((s, i) => (
                <div key={i} style={{ ...card, marginBottom: '6px', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600 }}>{s.name}</div>
                    <div style={{ fontSize: '11px', color: t.textMuted }}>{s.bookings} bookings · {s.pct}%</div>
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: 900, color: '#22c55e' }}>{s.rev}</div>
                </div>
              ))}

              <div style={{ fontSize: '11px', fontWeight: 700, color: t.textMuted, marginBottom: '8px', marginTop: '16px', letterSpacing: '1px' }}>COUPON IMPACT</div>
              <div style={{ ...card }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '12px', color: t.textMuted }}>Coupons redeemed this month</span>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: '#E8654A' }}>18</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '12px', color: t.textMuted }}>Total discount given</span>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: '#ef4444' }}>-$186.50</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '12px', color: t.textMuted }}>Revenue from coupon users</span>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: '#22c55e' }}>$1,420.00</span>
                </div>
                <div style={{ fontSize: '11px', color: '#22c55e', marginTop: '8px', fontWeight: 600 }}>ROI: Coupons generated 7.6x their cost in revenue</div>
              </div>
            </div>
          )}

          {/* ═══ PERFORMANCE ═══ */}
          {activeTab === 'performance' && (
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '16px' }}>Performance</h2>

              <div style={{ fontSize: '11px', fontWeight: 700, color: t.textMuted, marginBottom: '8px', letterSpacing: '1px' }}>STAFF RANKING</div>
              {STAFF_STATS.map((s, i) => (
                <div key={i} style={{ ...card, marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ fontSize: '18px' }}>{i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}</div>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 700 }}>{s.name}</div>
                      <div style={{ fontSize: '11px', color: t.textMuted }}>⭐ {s.rating} · {s.checkins} check-ins · {s.reviews} reviews</div>
                    </div>
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: 800, color: '#22c55e' }}>{s.commission}</div>
                </div>
              ))}

              <div style={{ fontSize: '11px', fontWeight: 700, color: '#ef4444', marginBottom: '8px', marginTop: '20px', letterSpacing: '1px' }}>⚠️ DORMANT MEMBERS</div>
              {MEMBERS.filter(m => m.tags.some(tg => tg.startsWith('dormant'))).map((m, i) => (
                <div key={i} style={{ ...card, marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderColor: 'rgba(239,68,68,0.2)' }}>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 700 }}>{m.name}</div>
                    <div style={{ fontSize: '11px', color: t.textMuted }}>Last: {m.lastVisit} · {m.package}</div>
                  </div>
                  <button style={{ fontSize: '11px', padding: '6px 14px', borderRadius: '8px', background: 'rgba(232,101,74,0.1)', border: '1px solid rgba(232,101,74,0.3)', color: '#E8654A', cursor: 'pointer', fontWeight: 600 }}>Send Reminder</button>
                </div>
              ))}

              <div style={{ fontSize: '11px', fontWeight: 700, color: '#f5c842', marginBottom: '8px', marginTop: '20px', letterSpacing: '1px' }}>⏰ EXPIRING SOON</div>
              <div style={{ ...card, borderColor: 'rgba(245,200,66,0.2)' }}>
                <div style={{ fontSize: '14px', fontWeight: 700 }}>Anna Park — Gel Nails 10-Pack</div>
                <div style={{ fontSize: '12px', color: t.textMuted }}>2 sessions remaining · Expires in 30 days</div>
                <div style={{ fontSize: '11px', color: '#f5c842', marginTop: '4px' }}>SMS reminder sent on Mar 5</div>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div style={{ padding: '20px 24px', borderTop: `1px solid ${t.border}`, textAlign: 'center', fontSize: '10px', color: t.textMuted }}>
          DEMO · All data is simulated · Lush Nail Studio · ReplyWise AI
        </div>
      </main>

      {/* ═══ RESPONSIVE STYLES ═══ */}
      <style>{`
        @media (max-width: 768px) {
          .mobile-hamburger { display: flex !important; }
          main { margin-left: 0 !important; }
          aside { transform: translateX(-100%); }
          aside[style*="translateX(0)"] { transform: translateX(0) !important; }
        }
        @media (max-width: 640px) {
          main > div > div[style*="grid-template-columns: repeat(4"] {
            grid-template-columns: repeat(2, 1fr) !important;
          }
          main > div > div[style*="grid-template-columns: 2fr 1fr"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
