'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';

const TOUR_COMPLETED_KEY = 'replywiseai_tour_completed';

interface TourStep {
  selector: string | null;
  title: string;
  description: string;
  position: 'center' | 'right' | 'bottom';
  /** If set, navigate to this URL when entering this step */
  navigateTo?: string;
  /** CTA button label (defaults to "Next") */
  ctaLabel?: string;
  /** CTA navigates to this page (for final step) */
  ctaHref?: string;
  /** Emoji or icon prefix for the title */
  emoji?: string;
}

const STEPS: TourStep[] = [
  {
    selector: null,
    title: "Set up auto-monitoring in 3 minutes!",
    description:
      "Welcome to ReplyWise AI! I'll walk you through the essential setup — connect Google, set up alerts, and let AI handle your reviews.",
    position: 'center',
    emoji: '👋',
    ctaLabel: "Let's Go!",
  },
  {
    selector: 'a[href="/admin/settings/google"]',
    title: 'Step 1: Connect Google Business',
    description:
      "This is the most important step — it links your Google Business Profile so we can monitor reviews and publish AI replies. Just click here and sign in with Google.",
    position: 'right',
    emoji: '🔗',
    navigateTo: '/admin',
  },
  {
    selector: 'a[href="/admin/settings/notifications"]',
    title: 'Step 2: Set Up Notifications',
    description:
      "Know immediately when reviews come in — especially bad ones. Connect Email, LINE, Slack, or WhatsApp so you never miss a review.",
    position: 'right',
    emoji: '🔔',
  },
  {
    selector: 'a[href="/admin/reviews"]',
    title: 'Step 3: Your Review Command Center',
    description:
      "Every new review shows up here instantly. Got a bad review? AI drafts a professional reply — you just click approve. No more stressing over what to say.",
    position: 'right',
    emoji: '⭐',
  },
  {
    selector: 'a[href="/admin/qr-codes"]',
    title: 'Step 4: Download Your QR Code',
    description:
      "Bonus: actively collect more reviews! Download the QR code, print it, and put it near the register or on tables. Customers scan, AI writes a review, they post it.",
    position: 'right',
    emoji: '📱',
  },
  {
    selector: null,
    title: "You're protected! 🎉",
    description:
      "AI is now watching your reviews 24/7. You'll get instant alerts for new reviews and AI-drafted replies ready to publish. Plus, use the QR code to actively collect 5-star reviews!",
    position: 'center',
    emoji: '🛡️',
    ctaLabel: 'Go to Review Command Center',
    ctaHref: '/admin/reviews',
  },
];

export default function OnboardingTour() {
  const [visible, setVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [spotlightRect, setSpotlightRect] = useState<DOMRect | null>(null);
  const rafRef = useRef<number>(0);
  const router = useRouter();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const completed = localStorage.getItem(TOUR_COMPLETED_KEY);
    if (!completed) {
      setVisible(true);
    }
  }, []);

  const updateSpotlight = useCallback(() => {
    const step = STEPS[currentStep];
    if (!step?.selector) {
      setSpotlightRect(null);
      return;
    }
    const el = document.querySelector(step.selector);
    if (el) {
      setSpotlightRect(el.getBoundingClientRect());
    } else {
      setSpotlightRect(null);
    }
  }, [currentStep]);

  useEffect(() => {
    // Small delay to let page render after navigation
    const timeout = setTimeout(updateSpotlight, 100);
    const handler = () => {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(updateSpotlight);
    };
    window.addEventListener('resize', handler);
    window.addEventListener('scroll', handler, true);
    return () => {
      clearTimeout(timeout);
      window.removeEventListener('resize', handler);
      window.removeEventListener('scroll', handler, true);
      cancelAnimationFrame(rafRef.current);
    };
  }, [updateSpotlight]);

  const completeTour = useCallback(() => {
    localStorage.setItem(TOUR_COMPLETED_KEY, 'true');
    setVisible(false);
  }, []);

  const nextStep = useCallback(() => {
    if (currentStep < STEPS.length - 1) {
      const next = currentStep + 1;
      setCurrentStep(next);
      // Navigate if the next step requires a different page
      if (STEPS[next].navigateTo) {
        router.push(STEPS[next].navigateTo!);
      }
    } else {
      completeTour();
      // Navigate to CTA href if set
      const step = STEPS[currentStep];
      if (step.ctaHref) {
        router.push(step.ctaHref);
      }
    }
  }, [currentStep, completeTour, router]);

  if (!visible) return null;

  const step = STEPS[currentStep];
  const isCenter = step.position === 'center' || !spotlightRect;
  const isLastStep = currentStep === STEPS.length - 1;
  const isFirstStep = currentStep === 0;

  const pad = 8;

  let tooltipStyle: React.CSSProperties = {};
  if (!isCenter && spotlightRect) {
    if (step.position === 'right') {
      tooltipStyle = {
        position: 'fixed',
        top: spotlightRect.top + spotlightRect.height / 2,
        left: spotlightRect.right + 20,
        transform: 'translateY(-50%)',
      };
    } else if (step.position === 'bottom') {
      tooltipStyle = {
        position: 'fixed',
        top: spotlightRect.bottom + 16,
        left: spotlightRect.left + spotlightRect.width / 2,
        transform: 'translateX(-50%)',
      };
    }
  }

  const overlay = (
    <div className="fixed inset-0 z-[9999] transition-opacity duration-300">
      {/* Dark overlay with spotlight cutout */}
      <svg className="absolute inset-0 w-full h-full" style={{ pointerEvents: 'none' }}>
        <defs>
          <mask id="tour-spotlight-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {spotlightRect && !isCenter && (
              <rect
                x={spotlightRect.left - pad}
                y={spotlightRect.top - pad}
                width={spotlightRect.width + pad * 2}
                height={spotlightRect.height + pad * 2}
                rx="12"
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect x="0" y="0" width="100%" height="100%" fill="rgba(0,0,0,0.65)" mask="url(#tour-spotlight-mask)" />
      </svg>

      <div className="absolute inset-0" onClick={(e) => e.stopPropagation()} />

      {/* Spotlight ring */}
      {spotlightRect && !isCenter && (
        <div
          className="absolute rounded-xl ring-2 ring-[#E8654A] ring-offset-2 pointer-events-none transition-all duration-300 animate-pulse"
          style={{
            top: spotlightRect.top - pad,
            left: spotlightRect.left - pad,
            width: spotlightRect.width + pad * 2,
            height: spotlightRect.height + pad * 2,
          }}
        />
      )}

      {/* Tooltip / Modal */}
      {isCenter ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-2xl border-t-4 border-[#E8654A] p-8 max-w-lg w-full mx-4 relative">
            {step.emoji && (
              <div className="text-4xl mb-3">{step.emoji}</div>
            )}
            <h2 className="text-xl font-bold text-[#3D3D3D]">{step.title}</h2>
            <p className="mt-3 text-[#6D6D6D] leading-relaxed">{step.description}</p>
            <div className="mt-6 flex items-center justify-between">
              <ProgressDots current={currentStep} total={STEPS.length} />
              <div className="flex items-center gap-3">
                <button
                  onClick={completeTour}
                  className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
                >
                  Skip tour
                </button>
                <button
                  onClick={nextStep}
                  className="px-6 py-2.5 bg-[#E8654A] text-white text-sm font-semibold rounded-xl hover:bg-[#C94D35] transition-colors shadow-lg shadow-[#E8654A]/20"
                >
                  {step.ctaLabel || 'Next'}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div style={tooltipStyle} className="z-[10000] max-w-sm">
          <div className="bg-white rounded-2xl shadow-2xl border-t-4 border-[#E8654A] p-6 relative">
            <div className="flex items-start gap-3">
              {step.emoji && (
                <div className="text-2xl flex-shrink-0 mt-0.5">{step.emoji}</div>
              )}
              <div>
                <h3 className="text-base font-bold text-[#3D3D3D]">{step.title}</h3>
                <p className="mt-2 text-sm text-[#6D6D6D] leading-relaxed">{step.description}</p>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between">
              <ProgressDots current={currentStep} total={STEPS.length} />
              <div className="flex items-center gap-3">
                <button
                  onClick={completeTour}
                  className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
                >
                  Skip
                </button>
                <button
                  onClick={nextStep}
                  className="px-5 py-2 bg-[#E8654A] text-white text-sm font-semibold rounded-xl hover:bg-[#C94D35] transition-colors shadow-lg shadow-[#E8654A]/20"
                >
                  {step.ctaLabel || 'Next'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(overlay, document.body);
}

function ProgressDots({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`h-2 rounded-full transition-all duration-300 ${
            i === current
              ? 'w-5 bg-[#E8654A]'
              : i < current
                ? 'w-2 bg-[#E8654A]/40'
                : 'w-2 bg-gray-200'
          }`}
        />
      ))}
      <span className="ml-2 text-xs text-gray-400 font-medium">
        {current + 1}/{total}
      </span>
    </div>
  );
}
