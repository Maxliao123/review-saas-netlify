'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Code, Copy, Check, Sun, Moon, LayoutGrid, GalleryHorizontal, Badge } from 'lucide-react';

type Theme = 'light' | 'dark';
type Layout = 'carousel' | 'grid' | 'badge';

export default function WidgetSettingsPage() {
  const [theme, setTheme] = useState<Theme>('light');
  const [maxReviews, setMaxReviews] = useState(5);
  const [layout, setLayout] = useState<Layout>('carousel');
  const [storeSlug, setStoreSlug] = useState<string>('');
  const [stores, setStores] = useState<{ slug: string; name: string }[]>([]);
  const [copied, setCopied] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  // Fetch stores from tenant context (via admin layout)
  useEffect(() => {
    async function loadStores() {
      try {
        const res = await fetch('/api/store');
        if (res.ok) {
          const data = await res.json();
          const storeList = data.stores || data || [];
          setStores(storeList);
          if (storeList.length > 0 && !storeSlug) {
            setStoreSlug(storeList[0].slug);
          }
        }
      } catch {
        // Stores will remain empty
      }
    }
    loadStores();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://www.replywiseai.com';
  const widgetUrl = `${baseUrl}/api/widget/${storeSlug}?theme=${theme}&max=${maxReviews}&layout=${layout}`;
  const embedCode = `<script src="${widgetUrl}"></script>`;

  // Refresh preview when settings change
  const refreshPreview = useCallback(() => {
    if (!previewRef.current || !storeSlug) return;
    const container = previewRef.current;
    container.innerHTML = '';
    const script = document.createElement('script');
    script.src = widgetUrl;
    container.appendChild(script);
  }, [widgetUrl, storeSlug]);

  useEffect(() => {
    const timer = setTimeout(refreshPreview, 300);
    return () => clearTimeout(timer);
  }, [refreshPreview]);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(embedCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const textarea = document.createElement('textarea');
      textarea.value = embedCode;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-2">
        <Code className="w-8 h-8 text-blue-600" />
        <h1 className="text-3xl font-bold text-gray-800">Review Widget</h1>
      </div>
      <p className="text-sm text-gray-500 mb-8">
        Embed a review showcase on your website. Copy the snippet below and paste it into your HTML.
      </p>

      {/* Settings */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Store selector */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Store</label>
          <select
            value={storeSlug}
            onChange={(e) => setStoreSlug(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {stores.length === 0 && (
              <option value="">No stores found</option>
            )}
            {stores.map((s) => (
              <option key={s.slug} value={s.slug}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        {/* Theme */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Theme</label>
          <div className="flex gap-2">
            <button
              onClick={() => setTheme('light')}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                theme === 'light'
                  ? 'bg-blue-50 border-blue-300 text-blue-700'
                  : 'border-gray-300 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Sun className="w-4 h-4" /> Light
            </button>
            <button
              onClick={() => setTheme('dark')}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                theme === 'dark'
                  ? 'bg-blue-50 border-blue-300 text-blue-700'
                  : 'border-gray-300 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Moon className="w-4 h-4" /> Dark
            </button>
          </div>
        </div>

        {/* Max reviews */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Max Reviews</label>
          <select
            value={maxReviews}
            onChange={(e) => setMaxReviews(parseInt(e.target.value, 10))}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value={5}>5 reviews</option>
            <option value={10}>10 reviews</option>
            <option value={15}>15 reviews</option>
          </select>
        </div>
      </div>

      {/* Layout selector */}
      <div className="mb-8">
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Layout Style</label>
        <div className="flex gap-3">
          {([
            { value: 'carousel', label: 'Carousel', icon: GalleryHorizontal },
            { value: 'grid', label: 'Grid', icon: LayoutGrid },
            { value: 'badge', label: 'Badge', icon: Badge },
          ] as const).map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              onClick={() => setLayout(value)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                layout === value
                  ? 'bg-blue-50 border-blue-300 text-blue-700'
                  : 'border-gray-300 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Icon className="w-4 h-4" /> {label}
            </button>
          ))}
        </div>
      </div>

      {/* Embed code */}
      <div className="mb-8">
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Embed Code</label>
        <div className="relative">
          <pre className="bg-gray-900 text-green-400 rounded-lg p-4 pr-14 text-sm overflow-x-auto font-mono">
            {embedCode}
          </pre>
          <button
            onClick={handleCopy}
            className="absolute top-3 right-3 p-2 bg-gray-700 hover:bg-gray-600 rounded-md transition-colors"
            title="Copy to clipboard"
          >
            {copied ? (
              <Check className="w-4 h-4 text-green-400" />
            ) : (
              <Copy className="w-4 h-4 text-gray-300" />
            )}
          </button>
        </div>
        {copied && (
          <p className="text-sm text-green-600 mt-1.5">Copied to clipboard!</p>
        )}
      </div>

      {/* Live preview */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Live Preview</label>
        <div
          className={`rounded-lg border p-6 min-h-[200px] ${
            theme === 'dark' ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'
          }`}
        >
          {storeSlug ? (
            <div ref={previewRef} />
          ) : (
            <p className="text-sm text-gray-400 text-center py-12">
              Select a store to preview the widget
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
