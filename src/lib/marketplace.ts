/**
 * Marketplace — Review Response Specialist Platform
 *
 * Connects store owners with professional review response writers.
 * Specialists write high-quality, personalized replies to customer reviews.
 */

// --------------- Types ---------------

export type OrderType = 'one_time' | 'batch' | 'ongoing';
export type OrderStatus = 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled' | 'disputed';
export type AssignmentStatus = 'pending' | 'in_progress' | 'submitted' | 'approved' | 'rejected' | 'revision_requested';

export interface Specialist {
  id: string;
  user_id: string;
  display_name: string;
  avatar_url?: string | null;
  bio?: string | null;
  languages: string[];
  verticals: string[];
  hourly_rate?: number | null;
  per_review_rate: number;
  rating_avg: number;
  rating_count: number;
  total_reviews_written: number;
  total_earnings: number;
  response_time_avg_hours: number;
  is_verified: boolean;
  is_available: boolean;
  portfolio_samples: PortfolioSample[];
  certifications: string[];
  created_at: string;
}

export interface PortfolioSample {
  review_text: string;
  reply_text: string;
  rating: number;
  vertical: string;
  language: string;
}

export interface MarketplaceOrder {
  id: string;
  tenant_id: string;
  store_id: number;
  specialist_id: string;
  order_type: OrderType;
  status: OrderStatus;
  review_count: number;
  price_per_review: number;
  total_price: number;
  currency: string;
  instructions?: string | null;
  deadline_at?: string | null;
  accepted_at?: string | null;
  completed_at?: string | null;
  client_rating?: number | null;
  client_feedback?: string | null;
  created_at: string;
}

export interface Assignment {
  id: string;
  order_id: string;
  review_id?: string | null;
  specialist_id: string;
  status: AssignmentStatus;
  draft_reply?: string | null;
  revision_notes?: string | null;
  revision_count: number;
  submitted_at?: string | null;
  approved_at?: string | null;
  created_at: string;
}

// --------------- Constants ---------------

export const SUPPORTED_VERTICALS = [
  'restaurant',
  'hotel',
  'medical',
  'auto_repair',
  'salon',
  'retail',
  'fitness',
  'dental',
  'legal',
  'real_estate',
] as const;

export const VERTICAL_LABELS: Record<string, string> = {
  restaurant: 'Restaurant & Food',
  hotel: 'Hotel & Hospitality',
  medical: 'Medical & Healthcare',
  auto_repair: 'Auto Repair & Service',
  salon: 'Salon & Spa',
  retail: 'Retail & E-commerce',
  fitness: 'Fitness & Wellness',
  dental: 'Dental',
  legal: 'Legal Services',
  real_estate: 'Real Estate',
};

export const ORDER_TYPE_LABELS: Record<OrderType, { label: string; description: string }> = {
  one_time: {
    label: 'One-Time',
    description: 'Respond to a specific batch of reviews',
  },
  batch: {
    label: 'Batch Package',
    description: 'Respond to a fixed number of reviews (e.g. 50 reviews)',
  },
  ongoing: {
    label: 'Ongoing',
    description: 'Specialist handles all new reviews continuously',
  },
};

export const ORDER_STATUS_LABELS: Record<OrderStatus, { label: string; color: string; bgColor: string }> = {
  pending: { label: 'Pending', color: 'text-yellow-700', bgColor: 'bg-yellow-100' },
  accepted: { label: 'Accepted', color: 'text-blue-700', bgColor: 'bg-blue-100' },
  in_progress: { label: 'In Progress', color: 'text-indigo-700', bgColor: 'bg-indigo-100' },
  completed: { label: 'Completed', color: 'text-green-700', bgColor: 'bg-green-100' },
  cancelled: { label: 'Cancelled', color: 'text-gray-500', bgColor: 'bg-gray-100' },
  disputed: { label: 'Disputed', color: 'text-red-700', bgColor: 'bg-red-100' },
};

export const ASSIGNMENT_STATUS_LABELS: Record<AssignmentStatus, { label: string; color: string }> = {
  pending: { label: 'Pending', color: 'text-yellow-600' },
  in_progress: { label: 'Writing', color: 'text-blue-600' },
  submitted: { label: 'Submitted', color: 'text-indigo-600' },
  approved: { label: 'Approved', color: 'text-green-600' },
  rejected: { label: 'Rejected', color: 'text-red-600' },
  revision_requested: { label: 'Revision', color: 'text-orange-600' },
};

// Platform commission rate
export const PLATFORM_COMMISSION_RATE = 0.15; // 15%

// --------------- Specialist Scoring & Ranking ---------------

/**
 * Calculates a composite score for ranking specialists in search.
 * Higher = better match.
 */
export function calculateSpecialistScore(
  specialist: Specialist,
  filters?: {
    language?: string;
    vertical?: string;
    maxPrice?: number;
  }
): number {
  let score = 0;

  // Rating weight (0-25 points)
  score += specialist.rating_avg * 5;

  // Experience weight (0-20 points, log scale)
  const reviewsWritten = specialist.total_reviews_written;
  score += Math.min(20, Math.log2(reviewsWritten + 1) * 3);

  // Availability bonus (5 points)
  if (specialist.is_available) score += 5;

  // Verified badge bonus (10 points)
  if (specialist.is_verified) score += 10;

  // Response time bonus (0-10 points, faster = better)
  if (specialist.response_time_avg_hours <= 2) score += 10;
  else if (specialist.response_time_avg_hours <= 6) score += 7;
  else if (specialist.response_time_avg_hours <= 12) score += 5;
  else if (specialist.response_time_avg_hours <= 24) score += 3;

  // Language match bonus (15 points)
  if (filters?.language && specialist.languages.includes(filters.language)) {
    score += 15;
  }

  // Vertical match bonus (15 points)
  if (filters?.vertical && specialist.verticals.includes(filters.vertical)) {
    score += 15;
  }

  // Price match (no penalty for being under budget, penalty for being over)
  if (filters?.maxPrice && specialist.per_review_rate > filters.maxPrice) {
    score -= 10;
  }

  return Math.round(score * 10) / 10;
}

/**
 * Sorts specialists by composite score.
 */
export function rankSpecialists(
  specialists: Specialist[],
  filters?: {
    language?: string;
    vertical?: string;
    maxPrice?: number;
  }
): Array<Specialist & { score: number }> {
  return specialists
    .map(s => ({
      ...s,
      score: calculateSpecialistScore(s, filters),
    }))
    .sort((a, b) => b.score - a.score);
}

// --------------- Order Calculations ---------------

/**
 * Calculates the order total including platform commission.
 */
export function calculateOrderTotal(
  pricePerReview: number,
  reviewCount: number
): {
  subtotal: number;
  commission: number;
  total: number;
  specialistPayout: number;
} {
  const subtotal = pricePerReview * reviewCount;
  const commission = Math.round(subtotal * PLATFORM_COMMISSION_RATE * 100) / 100;
  const total = Math.round((subtotal + commission) * 100) / 100;
  const specialistPayout = Math.round((subtotal - commission) * 100) / 100;

  return { subtotal, commission, total, specialistPayout };
}

// --------------- Validation ---------------

/**
 * Validates specialist profile input.
 */
export function validateSpecialistProfile(input: Partial<Specialist>): string[] {
  const errors: string[] = [];

  if (!input.display_name || input.display_name.trim().length < 2) {
    errors.push('Display name must be at least 2 characters');
  }

  if (input.display_name && input.display_name.length > 50) {
    errors.push('Display name must be 50 characters or less');
  }

  if (input.bio && input.bio.length > 500) {
    errors.push('Bio must be 500 characters or less');
  }

  if (input.per_review_rate !== undefined && (input.per_review_rate < 0.5 || input.per_review_rate > 100)) {
    errors.push('Per-review rate must be between $0.50 and $100');
  }

  if (input.languages && input.languages.length === 0) {
    errors.push('At least one language is required');
  }

  if (input.verticals && input.verticals.length === 0) {
    errors.push('At least one industry vertical is required');
  }

  return errors;
}

/**
 * Validates an order creation input.
 */
export function validateOrderInput(input: {
  review_count?: number;
  price_per_review?: number;
  order_type?: string;
  deadline_at?: string;
}): string[] {
  const errors: string[] = [];

  if (!input.review_count || input.review_count < 1 || input.review_count > 1000) {
    errors.push('Review count must be between 1 and 1000');
  }

  if (!input.price_per_review || input.price_per_review <= 0) {
    errors.push('Price per review must be positive');
  }

  if (input.order_type && !['one_time', 'batch', 'ongoing'].includes(input.order_type)) {
    errors.push('Invalid order type');
  }

  if (input.deadline_at) {
    const deadline = new Date(input.deadline_at);
    if (isNaN(deadline.getTime())) {
      errors.push('Invalid deadline date');
    } else if (deadline < new Date()) {
      errors.push('Deadline must be in the future');
    }
  }

  return errors;
}

// --------------- Statistics ---------------

/**
 * Calculates marketplace platform-level stats.
 */
export function calculateMarketplaceStats(
  specialists: Specialist[],
  orders: MarketplaceOrder[]
): {
  totalSpecialists: number;
  availableSpecialists: number;
  verifiedSpecialists: number;
  totalOrders: number;
  completedOrders: number;
  activeOrders: number;
  totalRevenue: number;
  avgOrderValue: number;
  avgSpecialistRating: number;
  completionRate: string;
  topVerticals: Array<{ vertical: string; count: number }>;
  topLanguages: Array<{ language: string; count: number }>;
} {
  const totalSpecialists = specialists.length;
  const availableSpecialists = specialists.filter(s => s.is_available).length;
  const verifiedSpecialists = specialists.filter(s => s.is_verified).length;

  const totalOrders = orders.length;
  const completedOrders = orders.filter(o => o.status === 'completed').length;
  const activeOrders = orders.filter(o => ['pending', 'accepted', 'in_progress'].includes(o.status)).length;

  const totalRevenue = orders
    .filter(o => o.status === 'completed')
    .reduce((sum, o) => sum + o.total_price, 0);

  const avgOrderValue = completedOrders > 0 ? Math.round(totalRevenue / completedOrders * 100) / 100 : 0;

  const ratedSpecialists = specialists.filter(s => s.rating_count > 0);
  const avgSpecialistRating = ratedSpecialists.length > 0
    ? Math.round(ratedSpecialists.reduce((sum, s) => sum + s.rating_avg, 0) / ratedSpecialists.length * 100) / 100
    : 0;

  const completionRate = totalOrders > 0
    ? `${Math.round((completedOrders / totalOrders) * 100)}%`
    : '0%';

  // Count verticals across specialists
  const verticalCounts = new Map<string, number>();
  for (const s of specialists) {
    for (const v of s.verticals) {
      verticalCounts.set(v, (verticalCounts.get(v) || 0) + 1);
    }
  }
  const topVerticals = [...verticalCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([vertical, count]) => ({ vertical, count }));

  // Count languages
  const langCounts = new Map<string, number>();
  for (const s of specialists) {
    for (const l of s.languages) {
      langCounts.set(l, (langCounts.get(l) || 0) + 1);
    }
  }
  const topLanguages = [...langCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([language, count]) => ({ language, count }));

  return {
    totalSpecialists,
    availableSpecialists,
    verifiedSpecialists,
    totalOrders,
    completedOrders,
    activeOrders,
    totalRevenue,
    avgOrderValue,
    avgSpecialistRating,
    completionRate,
    topVerticals,
    topLanguages,
  };
}

// --------------- Matching Algorithm ---------------

/**
 * Suggests best specialists for a given review based on language, vertical, and availability.
 */
export function suggestSpecialistsForReview(
  specialists: Specialist[],
  review: {
    language?: string;
    vertical?: string;
    rating?: number;
  },
  limit: number = 5
): Specialist[] {
  const available = specialists.filter(s => s.is_available);

  const scored = available.map(s => {
    let matchScore = 0;

    // Language match
    if (review.language && s.languages.includes(review.language)) {
      matchScore += 30;
    }

    // Vertical match
    if (review.vertical && s.verticals.includes(review.vertical)) {
      matchScore += 25;
    }

    // Prefer specialists with more experience for negative reviews
    if (review.rating && review.rating <= 2 && s.total_reviews_written > 50) {
      matchScore += 15;
    }

    // Rating bonus
    matchScore += s.rating_avg * 5;

    // Verified bonus
    if (s.is_verified) matchScore += 10;

    // Faster response time
    if (s.response_time_avg_hours <= 4) matchScore += 10;

    return { specialist: s, matchScore };
  });

  return scored
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, limit)
    .map(s => s.specialist);
}

// --------------- Earnings Projection ---------------

/**
 * Projects specialist earnings based on current data.
 */
export function projectSpecialistEarnings(
  specialist: Specialist,
  monthlyReviewVolume: number = 100
): {
  monthlyGross: string;
  monthlyNet: string;
  annualNet: string;
  reviewsPerDay: number;
} {
  const rate = specialist.per_review_rate;
  const monthlyGross = rate * monthlyReviewVolume;
  const monthlyNet = monthlyGross * (1 - PLATFORM_COMMISSION_RATE);
  const annualNet = monthlyNet * 12;
  const reviewsPerDay = Math.round(monthlyReviewVolume / 30);

  return {
    monthlyGross: `$${monthlyGross.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
    monthlyNet: `$${monthlyNet.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
    annualNet: `$${annualNet.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
    reviewsPerDay,
  };
}
