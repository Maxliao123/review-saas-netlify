'use client';

import { useState, useEffect } from 'react';
import { BookOpen, ChevronDown, ChevronUp } from 'lucide-react';
import { toHeadingId } from '@/lib/heading-utils';

interface TocItem {
  id: string;
  text: string;
  level: 2 | 3;
}

interface TableOfContentsProps {
  sections: Array<{ heading: string }>;
}

export function TableOfContents({ sections }: TableOfContentsProps) {
  const [activeId, setActiveId] = useState<string>('');
  const [isOpen, setIsOpen] = useState(true);

  const items: TocItem[] = sections.map((s, i) => ({
    id: toHeadingId(s.heading),
    text: s.heading,
    level: 2,
  }));

  // Scroll spy with IntersectionObserver
  useEffect(() => {
    if (items.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length > 0) {
          setActiveId(visible[0].target.id);
        }
      },
      { rootMargin: '-80px 0px -60% 0px', threshold: 0.1 }
    );

    for (const item of items) {
      const el = document.getElementById(item.id);
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, [items]);

  if (items.length < 3) return null;

  return (
    <div className="rounded-xl bg-gray-50 border border-gray-100 p-5">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between text-xs font-semibold text-gray-500 uppercase tracking-wider"
      >
        <span className="flex items-center gap-2">
          <BookOpen className="h-3.5 w-3.5" />
          Table of Contents
        </span>
        {isOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
      </button>
      {isOpen && (
        <ol className="mt-4 space-y-1.5">
          {items.map((item, i) => (
            <li key={item.id}>
              <a
                href={`#${item.id}`}
                onClick={(e) => {
                  e.preventDefault();
                  const el = document.getElementById(item.id);
                  if (el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    history.replaceState(null, '', `#${item.id}`);
                  }
                }}
                className={`block text-sm py-0.5 transition-colors ${
                  activeId === item.id
                    ? 'text-[#E8654A] font-medium'
                    : 'text-gray-600 hover:text-[#E8654A]'
                } ${item.level === 3 ? 'pl-4' : ''}`}
              >
                {i + 1}. {item.text}
              </a>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

/** Sidebar variant for desktop sticky sidebar */
export function SidebarTOC({ sections }: TableOfContentsProps) {
  const [activeId, setActiveId] = useState<string>('');

  const items: TocItem[] = sections.map((s) => ({
    id: toHeadingId(s.heading),
    text: s.heading,
    level: 2,
  }));

  useEffect(() => {
    if (items.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length > 0) {
          setActiveId(visible[0].target.id);
        }
      },
      { rootMargin: '-80px 0px -60% 0px', threshold: 0.1 }
    );

    for (const item of items) {
      const el = document.getElementById(item.id);
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, [items]);

  if (items.length < 3) return null;

  return (
    <nav>
      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
        <BookOpen className="h-3.5 w-3.5" />
        On this page
      </h3>
      <ol className="space-y-1 border-l-2 border-gray-100">
        {items.map((item, i) => (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              onClick={(e) => {
                e.preventDefault();
                const el = document.getElementById(item.id);
                if (el) {
                  el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  history.replaceState(null, '', `#${item.id}`);
                }
              }}
              className={`block pl-3 py-1 text-xs leading-snug transition-colors border-l-2 -ml-[2px] ${
                activeId === item.id
                  ? 'border-[#E8654A] text-[#E8654A] font-medium'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {item.text}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
