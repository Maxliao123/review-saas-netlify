'use client';

import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  TrendingUp,
  Users,
  Star,
  BarChart3,
  Zap,
  ArrowRight,
  Calculator,
  Search,
  Loader2,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  Target,
  Clock,
  MessageSquare,
  QrCode,
  Building2,
} from 'lucide-react';

interface Suggestion {
  placeId: string;
  name: string;
  address: string;
  rating: number;
  reviewCount: number;
  industry: string;
}

const INDUSTRIES = [
  { id: 'restaurant', label: 'Restaurant / Café', avgTicket: 35, visitRate: 0.06 },
  { id: 'hotel', label: 'Hotel / B&B', avgTicket: 180, visitRate: 0.04 },
  { id: 'clinic', label: 'Clinic / Dental', avgTicket: 120, visitRate: 0.05 },
  { id: 'salon', label: 'Salon / Spa', avgTicket: 65, visitRate: 0.07 },
  { id: 'auto', label: 'Auto Shop / Service', avgTicket: 250, visitRate: 0.03 },
  { id: 'retail', label: 'Retail Store', avgTicket: 50, visitRate: 0.05 },
  { id: 'other', label: 'Other Business', avgTicket: 75, visitRate: 0.04 },
] as const;

export function ROICalculator() {
  const [industry, setIndustry] = useState('restaurant');
  const [currentReviews, setCurrentReviews] = useState(25);
  const [currentRating, setCurrentRating] = useState(4.2);
  const [monthlyCustomers, setMonthlyCustomers] = useState(800);
  const [avgTicket, setAvgTicket] = useState(35);

  // Business search + autocomplete state
  const [searchInput, setSearchInput] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectLoading, setSelectLoading] = useState(false);
  const [selectedBusiness, setSelectedBusiness] = useState<{
    name: string;
    address: string;
    rating: number;
    reviewCount: number;
    industry: string;
  } | null>(null);
  const [lookupError, setLookupError] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced autocomplete fetch
  const fetchSuggestions = useCallback(async (input: string) => {
    if (input.length < 2) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    // If it's a Google Maps URL, use the lookup API directly
    if (input.includes('google.com/maps') || input.includes('goo.gl')) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    setSearchLoading(true);
    try {
      const res = await fetch('/api/tools/business-autocomplete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input }),
      });
      if (res.ok) {
        const data = await res.json();
        setSuggestions(data.suggestions || []);
        setShowDropdown((data.suggestions || []).length > 0);
      }
    } catch {
      // Silently fail autocomplete
    } finally {
      setSearchLoading(false);
    }
  }, []);

  function handleInputChange(value: string) {
    setSearchInput(value);
    setLookupError('');

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(value), 500);
  }

  // Select a suggestion → data already includes rating + reviewCount, no extra API call needed
  function handleSelectSuggestion(suggestion: Suggestion) {
    setShowDropdown(false);
    setSearchInput(suggestion.name);
    setLookupError('');

    // Set the selected business display
    setSelectedBusiness({
      name: suggestion.name,
      address: suggestion.address,
      rating: suggestion.rating,
      reviewCount: suggestion.reviewCount,
      industry: suggestion.industry,
    });

    // Auto-fill the calculator
    setCurrentReviews(suggestion.reviewCount || 0);
    setCurrentRating(suggestion.rating || 4.0);
    if (suggestion.industry && INDUSTRIES.some((i) => i.id === suggestion.industry)) {
      setIndustry(suggestion.industry);
      const ind = INDUSTRIES.find((i) => i.id === suggestion.industry);
      if (ind) setAvgTicket(ind.avgTicket);
    }
  }

  // Handle Enter key or Look up button for URLs
  async function handleDirectLookup() {
    const input = searchInput.trim();
    if (!input) return;

    setShowDropdown(false);
    setSelectLoading(true);
    setLookupError('');
    setSelectedBusiness(null);

    try {
      const isUrl = input.includes('google.com/maps') || input.includes('goo.gl');
      const res = await fetch('/api/tools/business-lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isUrl ? { url: input } : { query: input }),
      });

      if (!res.ok) {
        const data = await res.json();
        setLookupError(data.error || 'Could not find the business');
        return;
      }

      const data = await res.json();
      setSelectedBusiness(data);

      setCurrentReviews(data.reviewCount || 0);
      setCurrentRating(data.rating || 4.0);
      if (data.industry && INDUSTRIES.some((i) => i.id === data.industry)) {
        setIndustry(data.industry);
        const ind = INDUSTRIES.find((i) => i.id === data.industry);
        if (ind) setAvgTicket(ind.avgTicket);
      }
    } catch {
      setLookupError('Network error. Please try again.');
    } finally {
      setSelectLoading(false);
    }
  }

  const industryData = INDUSTRIES.find((i) => i.id === industry) || INDUSTRIES[0];

  const results = useMemo(() => {
    // Conservative estimates based on published research
    const scanToReviewRate = 0.18; // 18% of customers who scan QR leave a review
    const askRate = 0.40; // 40% of customers are asked/see the QR code
    const customersAsked = monthlyCustomers * askRate;
    const newReviewsPerMonth = Math.round(customersAsked * scanToReviewRate);

    // After 6 months
    const reviewsAfter6Months = currentReviews + newReviewsPerMonth * 6;

    // Rating improvement (more reviews tend to regress to mean, assumed mostly positive)
    const newAvgRating = Math.min(
      5,
      (currentRating * currentReviews + 4.7 * newReviewsPerMonth * 6) /
        (currentReviews + newReviewsPerMonth * 6)
    );
    const ratingImprovement = newAvgRating - currentRating;

    // Revenue impact:
    // Each 0.1 star improvement → ~1% revenue increase (conservative from HBS study)
    // Each 10 new reviews → 3% more profile views → visitRate% convert
    const ratingRevenueBoost = (ratingImprovement / 0.1) * 0.01;
    const visibilityBoost = ((newReviewsPerMonth * 6) / 10) * 0.03;
    const totalVisibilityIncrease = Math.min(visibilityBoost, 0.5); // cap at 50%

    const currentMonthlyRevenue = monthlyCustomers * avgTicket;
    const additionalCustomers = Math.round(
      monthlyCustomers * totalVisibilityIncrease * industryData.visitRate
    );
    const revenueFromNewCustomers = additionalCustomers * avgTicket;
    const revenueFromRatingBoost = currentMonthlyRevenue * ratingRevenueBoost;
    const totalAdditionalMonthlyRevenue = Math.round(
      revenueFromNewCustomers + revenueFromRatingBoost
    );
    const totalAdditionalAnnualRevenue = totalAdditionalMonthlyRevenue * 12;

    // Cost comparison
    const repMonitorCost = 29; // Starter plan
    const roi = repMonitorCost > 0
      ? Math.round(((totalAdditionalMonthlyRevenue - repMonitorCost) / repMonitorCost) * 100)
      : 0;

    // --- Diagnosis: identify specific problems & recommendations ---
    type Diagnosis = {
      icon: 'alert' | 'star' | 'clock' | 'message' | 'target';
      severity: 'critical' | 'warning' | 'info';
      problem: string;
      impact: string;
      solution: string;
    };
    const diagnoses: Diagnosis[] = [];

    // 1. Low review count
    if (currentReviews < 10) {
      diagnoses.push({
        icon: 'alert',
        severity: 'critical',
        problem: 'Dangerously low review count',
        impact: `With only ${currentReviews} reviews, your business appears untrustworthy to 73% of consumers who require at least 10 reviews before trusting a business.`,
        solution: 'QR code + AI review assistant can generate 50+ reviews in your first month.',
      });
    } else if (currentReviews < 50) {
      diagnoses.push({
        icon: 'alert',
        severity: 'warning',
        problem: 'Below the visibility threshold',
        impact: `Businesses with 50+ reviews appear in 2.7x more local search results. You need ${50 - currentReviews} more reviews to cross this threshold.`,
        solution: 'Automated review collection can close this gap in 1-2 months.',
      });
    } else if (currentReviews < 200) {
      diagnoses.push({
        icon: 'target',
        severity: 'info',
        problem: 'Room to dominate local competitors',
        impact: `You have a solid base with ${currentReviews} reviews. Most local competitors have fewer — pushing to 200+ will establish clear dominance in local search.`,
        solution: 'Consistent AI-assisted review collection keeps you ahead.',
      });
    }

    // 2. Rating issues
    if (currentRating < 4.0) {
      diagnoses.push({
        icon: 'star',
        severity: 'critical',
        problem: `Rating below 4.0 is costing you customers`,
        impact: `A ${currentRating}-star rating filters you out of "top rated" searches. 57% of consumers won't use a business rated below 4 stars.`,
        solution: 'AI-guided reviews from happy customers naturally raise your average. Negative review alerts let you resolve issues before they become reviews.',
      });
    } else if (currentRating < 4.5) {
      diagnoses.push({
        icon: 'star',
        severity: 'warning',
        problem: `Rating gap: ${currentRating} → 4.5+ needed for top results`,
        impact: `The top 3 businesses in Google Maps average 4.5+ stars. Each 0.1-star increase drives ~1% more revenue ($${Math.round(monthlyCustomers * avgTicket * 0.01).toLocaleString()}/mo for you).`,
        solution: 'AI review suggestions help satisfied customers express their experience in detailed 5-star reviews.',
      });
    }

    // 3. Response rate (always recommend — most businesses don't respond)
    diagnoses.push({
      icon: 'message',
      severity: currentReviews > 50 ? 'warning' : 'info',
      problem: 'Review response rate matters more than ever',
      impact: 'Google confirms: businesses that respond to reviews rank higher. 89% of consumers read review responses before choosing a business.',
      solution: 'AI auto-drafts personalized replies in your brand voice — review and post in one click.',
    });

    // 4. Speed of collection
    if (monthlyCustomers > 200 && currentReviews < 100) {
      diagnoses.push({
        icon: 'clock',
        severity: 'warning',
        problem: 'You\'re leaving reviews on the table',
        impact: `With ${monthlyCustomers} monthly customers but only ${currentReviews} total reviews, you're capturing less than 1% of potential reviews. Industry leaders capture 15-25%.`,
        solution: 'QR codes at checkout + AI-generated review drafts make it effortless for customers to leave reviews in under 60 seconds.',
      });
    }

    return {
      newReviewsPerMonth,
      reviewsAfter6Months,
      newAvgRating: Math.round(newAvgRating * 10) / 10,
      ratingImprovement: Math.round(ratingImprovement * 10) / 10,
      additionalCustomers,
      totalAdditionalMonthlyRevenue,
      totalAdditionalAnnualRevenue,
      roi,
      repMonitorCost,
      diagnoses,
    };
  }, [industry, currentReviews, currentRating, monthlyCustomers, avgTicket, industryData]);

  const [showResults, setShowResults] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);

  function handleAnalyze() {
    setShowResults(true);
    // Smooth scroll to results after a tick
    setTimeout(() => {
      resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">

      {/* ── STEP 1: Search or Enter ── */}
      <div className="rounded-2xl bg-white ring-1 ring-gray-200 p-6 sm:p-8">
        <div className="flex items-center gap-2 mb-1">
          <Search className="h-5 w-5 text-blue-600" />
          <h2 className="text-lg font-bold text-gray-900">Find Your Business</h2>
        </div>
        <p className="text-sm text-gray-500 mb-5">Search your Google Business listing to auto-fill, or enter details manually.</p>

        {/* Search with Autocomplete */}
        <div className="relative" ref={dropdownRef}>
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              placeholder="Type your business name or paste Google Maps URL…"
              value={searchInput}
              onChange={(e) => handleInputChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  setShowDropdown(false);
                  handleDirectLookup();
                }
                if (e.key === 'Escape') setShowDropdown(false);
              }}
              onFocus={() => {
                if (suggestions.length > 0) setShowDropdown(true);
              }}
              className="w-full rounded-xl border border-gray-300 bg-white pl-10 pr-4 py-3 text-sm placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-shadow"
            />
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            {(searchLoading || selectLoading) && (
              <Loader2 className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-blue-500 animate-spin" />
            )}
          </div>

          {/* Autocomplete Dropdown */}
          {showDropdown && suggestions.length > 0 && (
            <div className="absolute z-50 top-full left-0 right-0 mt-1.5 rounded-xl bg-white shadow-2xl ring-1 ring-gray-200 overflow-hidden">
              {suggestions.map((s, i) => (
                <button
                  key={s.placeId || i}
                  onClick={() => handleSelectSuggestion(s)}
                  className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-blue-50 transition-colors border-b border-gray-100 last:border-b-0"
                >
                  <Building2 className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-gray-900 truncate">{s.name}</p>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                        <span className="text-xs font-semibold text-gray-700">{s.rating}</span>
                        <span className="text-xs text-gray-400">({s.reviewCount.toLocaleString()})</span>
                      </div>
                    </div>
                    {s.address && (
                      <p className="text-xs text-gray-500 truncate mt-0.5">
                        <MapPin className="inline h-3 w-3 mr-0.5" />{s.address}
                      </p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {lookupError && (
          <p className="mt-2 text-xs text-red-600">{lookupError}</p>
        )}

        {/* Selected Business Card */}
        {selectedBusiness && (
          <div className="mt-3 rounded-xl bg-emerald-50 p-4 ring-1 ring-emerald-200">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 mt-0.5 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-gray-900">{selectedBusiness.name}</p>
                <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                  <MapPin className="h-3 w-3 shrink-0" />
                  <span className="truncate">{selectedBusiness.address}</span>
                </p>
                <div className="flex items-center gap-4 mt-2">
                  <span className="flex items-center gap-1 text-sm font-semibold text-gray-800">
                    <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                    {selectedBusiness.rating}
                  </span>
                  <span className="text-sm text-gray-600">
                    {selectedBusiness.reviewCount.toLocaleString()} reviews
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Divider */}
        <div className="relative my-5">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-white px-3 text-gray-400">
              {selectedBusiness ? 'adjust if needed' : 'or enter manually'}
            </span>
          </div>
        </div>

        {/* Manual Input Fields — compact 2-col grid */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Industry</label>
            <select
              value={industry}
              onChange={(e) => {
                setIndustry(e.target.value);
                const ind = INDUSTRIES.find((i) => i.id === e.target.value);
                if (ind) setAvgTicket(ind.avgTicket);
              }}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
            >
              {INDUSTRIES.map((ind) => (
                <option key={ind.id} value={ind.id}>{ind.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Current Reviews
            </label>
            <input
              type="number" min={0} max={10000}
              value={currentReviews}
              onChange={(e) => setCurrentReviews(Math.max(0, parseInt(e.target.value) || 0))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Star Rating: <span className="text-blue-600 font-bold">{currentRating}</span>
            </label>
            <input
              type="range" min={10} max={50} step={1}
              value={Math.round(currentRating * 10)}
              onChange={(e) => setCurrentRating(parseInt(e.target.value) / 10)}
              className="w-full accent-blue-600"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Monthly Customers</label>
            <input
              type="number" min={0} max={100000}
              value={monthlyCustomers}
              onChange={(e) => setMonthlyCustomers(Math.max(0, parseInt(e.target.value) || 0))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-gray-600 mb-1">Average Transaction ($)</label>
            <input
              type="number" min={1} max={10000}
              value={avgTicket}
              onChange={(e) => setAvgTicket(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
            />
          </div>
        </div>

        {/* CTA Button */}
        <button
          onClick={handleAnalyze}
          className="mt-6 w-full rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-3.5 text-base font-semibold text-white hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2"
        >
          <Calculator className="h-5 w-5" />
          Analyze My Business
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>

      {/* ── STEP 2: Results (shown after clicking Analyze) ── */}
      {showResults && (
        <div ref={resultsRef} className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

          {/* Revenue Impact */}
          <div className="rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 p-6 sm:p-8 text-white">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="h-5 w-5" />
              <h2 className="text-lg font-bold">Projected Revenue Impact</h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl bg-white/10 backdrop-blur p-4">
                <div className="text-blue-200 text-xs font-medium mb-1">Monthly Revenue</div>
                <div className="text-2xl sm:text-3xl font-extrabold">
                  +${results.totalAdditionalMonthlyRevenue.toLocaleString()}
                </div>
              </div>
              <div className="rounded-xl bg-white/10 backdrop-blur p-4">
                <div className="text-blue-200 text-xs font-medium mb-1">Annual Revenue</div>
                <div className="text-2xl sm:text-3xl font-extrabold">
                  +${results.totalAdditionalAnnualRevenue.toLocaleString()}
                </div>
              </div>
              <div className="rounded-xl bg-white/10 backdrop-blur p-4">
                <div className="text-blue-200 text-xs font-medium mb-1">ROI</div>
                <div className="text-2xl sm:text-3xl font-extrabold text-emerald-300">
                  {results.roi}%
                </div>
                <div className="text-blue-300 text-xs mt-0.5">for ${results.repMonitorCost}/mo</div>
              </div>
            </div>
          </div>

          {/* Review Growth */}
          <div className="rounded-2xl bg-white ring-1 ring-gray-200 p-6">
            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-blue-600" />
              Review Growth Projection
            </h3>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg bg-gray-50 p-3 text-center">
                <div className="text-2xl font-bold text-gray-900">+{results.newReviewsPerMonth}</div>
                <div className="text-xs text-gray-500 mt-1">New Reviews / Month</div>
              </div>
              <div className="rounded-lg bg-gray-50 p-3 text-center">
                <div className="text-2xl font-bold text-gray-900">{results.reviewsAfter6Months}</div>
                <div className="text-xs text-gray-500 mt-1">Total After 6 Months</div>
              </div>
              <div className="rounded-lg bg-gray-50 p-3 text-center">
                <div className="text-2xl font-bold text-gray-900 flex items-center justify-center gap-1">
                  <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                  {results.newAvgRating}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Projected Rating
                  {results.ratingImprovement > 0 && (
                    <span className="text-emerald-600 font-medium"> (+{results.ratingImprovement})</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ── STEP 3: Diagnosis ── */}
          <div className="rounded-2xl bg-white ring-1 ring-gray-200 p-6">
            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-amber-500" />
              Your Review Health Diagnosis
            </h3>
            <div className="space-y-3">
              {results.diagnoses.map((d, i) => (
                <div
                  key={i}
                  className={`rounded-xl p-4 ${
                    d.severity === 'critical'
                      ? 'bg-red-50 ring-1 ring-red-100'
                      : d.severity === 'warning'
                      ? 'bg-amber-50 ring-1 ring-amber-100'
                      : 'bg-blue-50 ring-1 ring-blue-100'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 shrink-0 rounded-full p-1.5 ${
                      d.severity === 'critical'
                        ? 'bg-red-100 text-red-600'
                        : d.severity === 'warning'
                        ? 'bg-amber-100 text-amber-600'
                        : 'bg-blue-100 text-blue-600'
                    }`}>
                      {d.icon === 'alert' && <AlertTriangle className="h-3.5 w-3.5" />}
                      {d.icon === 'star' && <Star className="h-3.5 w-3.5" />}
                      {d.icon === 'clock' && <Clock className="h-3.5 w-3.5" />}
                      {d.icon === 'message' && <MessageSquare className="h-3.5 w-3.5" />}
                      {d.icon === 'target' && <Target className="h-3.5 w-3.5" />}
                    </div>
                    <div className="min-w-0">
                      <p className={`text-sm font-semibold ${
                        d.severity === 'critical' ? 'text-red-900'
                          : d.severity === 'warning' ? 'text-amber-900'
                          : 'text-blue-900'
                      }`}>{d.problem}</p>
                      <p className="text-xs text-gray-600 mt-1">{d.impact}</p>
                      <div className="mt-2 flex items-start gap-1.5">
                        <Zap className="h-3 w-3 text-blue-600 mt-0.5 shrink-0" />
                        <p className="text-xs font-medium text-blue-700">{d.solution}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── STEP 4: Solution + CTA ── */}
          <div className="rounded-2xl bg-gradient-to-br from-gray-900 to-gray-800 p-6 sm:p-8 text-white">
            <h3 className="text-lg font-bold mb-5 flex items-center gap-2">
              <Zap className="h-5 w-5 text-blue-400" />
              How Reputation Monitor Fixes This
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex items-start gap-3 rounded-xl bg-white/5 p-4">
                <div className="rounded-lg bg-blue-500/20 p-2 shrink-0">
                  <QrCode className="h-5 w-5 text-blue-300" />
                </div>
                <div>
                  <p className="text-sm font-semibold">QR Code + AI Review</p>
                  <p className="text-xs text-gray-400 mt-1">Customer scans → picks tags → AI writes 5-star review → one-tap post</p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-xl bg-white/5 p-4">
                <div className="rounded-lg bg-emerald-500/20 p-2 shrink-0">
                  <MessageSquare className="h-5 w-5 text-emerald-300" />
                </div>
                <div>
                  <p className="text-sm font-semibold">AI Reply Assistant</p>
                  <p className="text-xs text-gray-400 mt-1">Auto-drafts personalized responses in your brand voice — one click</p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-xl bg-white/5 p-4">
                <div className="rounded-lg bg-amber-500/20 p-2 shrink-0">
                  <AlertTriangle className="h-5 w-5 text-amber-300" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Negative Review Alerts</p>
                  <p className="text-xs text-gray-400 mt-1">Instant notifications so you resolve issues before they damage ratings</p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-xl bg-white/5 p-4">
                <div className="rounded-lg bg-purple-500/20 p-2 shrink-0">
                  <BarChart3 className="h-5 w-5 text-purple-300" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Analytics Dashboard</p>
                  <p className="text-xs text-gray-400 mt-1">Track reviews, ratings, sentiment, and competitors in real-time</p>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-5 border-t border-gray-700">
              <p className="text-center text-sm text-gray-300 mb-4">
                Based on your numbers: <span className="text-white font-bold">+{results.newReviewsPerMonth} reviews/month</span> and{' '}
                <span className="text-emerald-400 font-bold">${results.totalAdditionalAnnualRevenue.toLocaleString()}/year</span> additional revenue — for just ${results.repMonitorCost}/mo.
              </p>
              <Link
                href="/auth/signup"
                className="flex items-center justify-center gap-2 w-full rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 px-6 py-4 text-lg font-bold text-white hover:from-blue-600 hover:to-indigo-600 transition-all shadow-lg shadow-blue-500/30"
              >
                <Zap className="h-5 w-5" />
                Start Free — No Credit Card Required
                <ArrowRight className="h-5 w-5" />
              </Link>
              <p className="text-center text-xs text-gray-500 mt-3">Free plan includes 50 AI reviews/month</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
