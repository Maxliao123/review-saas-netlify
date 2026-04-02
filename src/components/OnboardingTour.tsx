'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';

const TOUR_COMPLETED_KEY = 'replywiseai_tour_completed';

interface TourStep {
  /** CSS selector to highlight, or null for centered modal */
  selector: string | null;
  title: string;
  description: string;
  /** Position of tooltip relative to highlighted element */
  position: 'center' | 'right' | 'bottom';
}

const STEPS: TourStep[] = [
  {
    selector: null,
    title: 'Welcome to ReplyWise AI!',
    description: "Let's take a quick tour to help you get started.",
    position: 'center',
  },
  {
    selector: 'a[href="/admin/qr-codes"]',
    title: 'QR Codes',
    description: 'Download and print QR codes for your store.',
    position: 'right',
  },
  {
    selector: 'a[href="/admin/reviews"]',
    title: 'Reviews',
    description: 'Monitor and reply to all your Google reviews here.',
    position: 'right',
  },
  {
    selector: 'a[href="/admin/analytics/scans"]',
    title: 'Analytics',
    description: 'Track your review performance and trends.',
    position: 'right',
  },
  {
    selector: 'a[href="/admin/settings/profile"]',
    title: 'Settings',
    description: 'Configure notifications, team, and integrations.',
    position: 'right',
  },
  {
    selector: null,
    title: "You're all set!",
    description: 'Start by downloading your QR codes.',
    position: 'center',
  },
];

export default function OnboardingTour() {
  const [visible, setVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [spotlightRect, setSpotlightRect] = useState<DOMRect | null>(null);
  const rafRef = useRef<number>(0);

  // Check if tour should show
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const completed = localStorage.getItem(TOUR_COMPLETED_KEY);
    if (!completed) {
      setVisible(true);
    }
  }, []);

  // Update spotlight position when step changes
  const updateSpotlight = useCallback(() => {
    const step = STEPS[currentStep];
    if (!step?.selector) {
      setSpotlightRect(null);
      return;
    }
    const el = document.querySelector(step.selector);
    if (el) {
      const rect = el.getBoundingClientRect();
      setSpotlightRect(rect);
    } else {
      setSpotlightRect(null);
    }
  }, [currentStep]);

  useEffect(() => {
    updateSpotlight();
    // Also update on scroll/resize
    const handler = () => {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(updateSpotlight);
    };
    window.addEventListener('resize', handler);
    window.addEventListener('scroll', handler, true);
    return () => {
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
      setCurrentStep((s) => s + 1);
    } else {
      completeTour();
    }
  }, [currentStep, completeTour]);

  if (!visible) return null;

  const step = STEPS[currentStep];
  const isCenter = step.position === 'center' || !spotlightRect;
  const isLastStep = currentStep === STEPS.length - 1;
  const isFirstStep = currentStep === 0;

  // Spotlight padding
  const pad = 6;

  // Tooltip position
  let tooltipStyle: React.CSSProperties = {};
  if (!isCenter && spotlightRect) {
    if (step.position === 'right') {
      tooltipStyle = {
        position: 'fixed',
        top: spotlightRect.top + spotlightRect.height / 2,
        left: spotlightRect.right + 16,
        transform: 'translateY(-50%)',
      };
    } else if (step.position === 'bottom') {
      tooltipStyle = {
        position: 'fixed',
        top: spotlightRect.bottom + 12,
        left: spotlightRect.left + spotlightRect.width / 2,
        transform: 'translateX(-50%)',
      };
    }
  }

  const overlay = (
    <div className="fixed inset-0 z-[9999] transition-opacity duration-300">
      {/* Dark overlay with spotlight cutout via SVG */}
      <svg
        className="absolute inset-0 w-full h-full"
        style={{ pointerEvents: 'none' }}
      >
        <defs>
          <mask id="tour-spotlight-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {spotlightRect && !isCenter && (
              <rect
                x={spotlightRect.left - pad}
                y={spotlightRect.top - pad}
                width={spotlightRect.width + pad * 2}
                height={spotlightRect.height + pad * 2}
                rx="10"
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(0,0,0,0.6)"
          mask="url(#tour-spotlight-mask)"
        />
      </svg>

      {/* Clickable overlay to prevent interaction behind */}
      <div className="absolute inset-0" onClick={(e) => e.stopPropagation()} />

      {/* Spotlight border ring */}
      {spotlightRect && !isCenter && (
        <div
          className="absolute rounded-[10px] ring-2 ring-[#E8654A] ring-offset-2 pointer-events-none transition-all duration-300"
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
        /* Centered modal */
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="bg-white rounded-xl shadow-2xl border-l-4 border-[#E8654A] p-8 max-w-md w-full mx-4 relative">
            <h2 className="text-xl font-bold text-gray-900">{step.title}</h2>
            <p className="mt-2 text-gray-600">{step.description}</p>
            <div className="mt-6 flex items-center justify-between">
              <ProgressDots current={currentStep} total={STEPS.length} />
              <div className="flex items-center gap-3">
                <button
                  onClick={completeTour}
                  className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
                >
                  Skip
                </button>
                {isLastStep ? (
                  <a
                    href="/admin/qr-codes"
                    onClick={completeTour}
                    className="px-5 py-2 bg-[#E8654A] text-white text-sm font-medium rounded-lg hover:bg-[#C94D35] transition-colors"
                  >
                    Go to QR Codes
                  </a>
                ) : (
                  <button
                    onClick={nextStep}
                    className="px-5 py-2 bg-[#E8654A] text-white text-sm font-medium rounded-lg hover:bg-[#C94D35] transition-colors"
                  >
                    {isFirstStep ? "Let's Go" : 'Next'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Positioned tooltip near highlighted element */
        <div style={tooltipStyle} className="z-[10000] max-w-xs">
          <div className="bg-white rounded-xl shadow-2xl border-l-4 border-[#E8654A] p-5 relative">
            <h3 className="text-base font-bold text-gray-900">{step.title}</h3>
            <p className="mt-1 text-sm text-gray-600">{step.description}</p>
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
                  className="px-4 py-1.5 bg-[#E8654A] text-white text-sm font-medium rounded-lg hover:bg-[#C94D35] transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // Use portal to render at document body level
  if (typeof document === 'undefined') return null;
  return createPortal(overlay, document.body);
}

function ProgressDots({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`h-1.5 rounded-full transition-all duration-300 ${
            i === current
              ? 'w-4 bg-[#E8654A]'
              : i < current
                ? 'w-1.5 bg-[#E8654A]/40'
                : 'w-1.5 bg-gray-200'
          }`}
        />
      ))}
      <span className="ml-2 text-[10px] text-gray-400">
        {current + 1} of {total}
      </span>
    </div>
  );
}
