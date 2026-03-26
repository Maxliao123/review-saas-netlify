/**
 * Referral program utilities
 * - Code generation, validation, tracking, reward logic
 */

import { createHash } from 'crypto';

/** Generate a unique referral code: RW-XXXXXX */
export function generateReferralCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no ambiguous chars
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return `RW-${code}`;
}

/** Hash IP for privacy-safe click tracking */
export function hashIP(ip: string): string {
  return createHash('sha256').update(ip + 'replywiseai-salt').digest('hex').slice(0, 16);
}

/** Referral reward config */
export const REFERRAL_REWARDS = {
  referrer: {
    type: 'free_month' as const,
    description: '1 month free when your referral upgrades',
    descriptionZh: '推薦人升級後獲得 1 個月免費',
  },
  referee: {
    type: 'discount' as const,
    discountPercent: 50,
    description: '50% off your first month',
    descriptionZh: '首月 50% 折扣',
  },
} as const;

/** Build referral signup URL */
export function buildReferralUrl(referralCode: string): string {
  const base = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.replywiseai.com';
  return `${base}/auth/signup?ref=${referralCode}`;
}

/** Build referral URL from customer-facing page */
export function buildViralReferralUrl(referralCode: string): string {
  const base = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.replywiseai.com';
  return `${base}?ref=${referralCode}`;
}
