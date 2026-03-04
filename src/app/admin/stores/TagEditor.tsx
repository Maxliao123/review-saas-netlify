'use client';

import { useState, useEffect } from 'react';
import { Plus, X, RotateCcw, Save, ChevronDown, ChevronRight } from 'lucide-react';
import { getStoreTags, saveStoreTags, TAG_CATEGORIES, type TagRow } from './actions';

interface TagEditorProps {
  storeId: number;
  storeName: string;
  preferredLocale?: string;
}

export default function TagEditor({ storeId, storeName, preferredLocale = 'zh' }: TagEditorProps) {
  const [locale, setLocale] = useState(preferredLocale);
  const [tagsByCategory, setTagsByCategory] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newTagInputs, setNewTagInputs] = useState<Record<string, string>>({});
  const [expanded, setExpanded] = useState(true);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    loadTags();
  }, [storeId, locale]);

  const loadTags = async () => {
    setLoading(true);
    const allTags = await getStoreTags(storeId);

    // Filter by current locale and group by question_key
    const grouped: Record<string, string[]> = {};
    TAG_CATEGORIES.forEach(cat => {
      grouped[cat.key] = [];
    });

    allTags
      .filter(t => t.locale === locale || t.locale === `${locale}-TW` || t.locale === `${locale}-CN`)
      .forEach(t => {
        if (grouped[t.question_key]) {
          grouped[t.question_key].push(t.label);
        }
      });

    setTagsByCategory(grouped);
    setHasChanges(false);
    setLoading(false);
  };

  const addTag = (categoryKey: string) => {
    const input = (newTagInputs[categoryKey] || '').trim();
    if (!input) return;

    // Prevent duplicates
    const current = tagsByCategory[categoryKey] || [];
    if (current.includes(input)) return;

    setTagsByCategory(prev => ({
      ...prev,
      [categoryKey]: [...(prev[categoryKey] || []), input],
    }));
    setNewTagInputs(prev => ({ ...prev, [categoryKey]: '' }));
    setHasChanges(true);
  };

  const removeTag = (categoryKey: string, index: number) => {
    setTagsByCategory(prev => ({
      ...prev,
      [categoryKey]: (prev[categoryKey] || []).filter((_, i) => i !== index),
    }));
    setHasChanges(true);
  };

  const loadDefaults = () => {
    const defaults: Record<string, string[]> = {};
    TAG_CATEGORIES.forEach(cat => {
      const defaultKey = locale === 'en' ? 'defaults_en' : 'defaults_zh';
      defaults[cat.key] = [...cat[defaultKey]];
    });
    setTagsByCategory(defaults);
    setHasChanges(true);
  };

  const handleSave = async () => {
    setSaving(true);
    const allTags: { question_key: string; label: string; locale: string; order_index: number }[] = [];

    Object.entries(tagsByCategory).forEach(([questionKey, labels]) => {
      labels.forEach((label, idx) => {
        allTags.push({
          question_key: questionKey,
          label,
          locale,
          order_index: idx,
        });
      });
    });

    const result = await saveStoreTags(storeId, allTags);
    if (result.success) {
      setHasChanges(false);
    } else {
      alert('Failed to save: ' + result.error);
    }
    setSaving(false);
  };

  const totalTagCount = Object.values(tagsByCategory).reduce((sum, arr) => sum + arr.length, 0);

  if (loading) {
    return <div className="text-sm text-gray-400 py-4">Loading tags...</div>;
  }

  return (
    <div className="mt-8">
      {/* Section Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 w-full text-left mb-4"
      >
        {expanded ? <ChevronDown className="w-5 h-5 text-gray-400" /> : <ChevronRight className="w-5 h-5 text-gray-400" />}
        <h2 className="text-xl font-bold text-gray-800">Survey Tags</h2>
        <span className="text-xs text-gray-400 ml-2">
          {totalTagCount} tags for {storeName}
        </span>
      </button>

      {!expanded ? null : (
        <div className="space-y-6">
          {/* Language + Actions Bar */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
              {[
                { code: 'zh', label: '中文' },
                { code: 'en', label: 'EN' },
                { code: 'ko', label: '한국어' },
                { code: 'ja', label: '日本語' },
              ].map(l => (
                <button
                  key={l.code}
                  onClick={() => setLocale(l.code)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    locale === l.code
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {l.label}
                </button>
              ))}
            </div>

            <button
              onClick={loadDefaults}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              Load Defaults
            </button>

            {hasChanges && (
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors ml-auto"
              >
                <Save className="w-3 h-3" />
                {saving ? 'Saving...' : 'Save Tags'}
              </button>
            )}
          </div>

          <p className="text-xs text-gray-400">
            These tags appear on the customer review page. Customers select tags to generate their Google review.
          </p>

          {/* Category Editors */}
          {TAG_CATEGORIES.map(cat => {
            const tags = tagsByCategory[cat.key] || [];
            const questionText = cat.question[locale as 'zh' | 'en'] || cat.question['en'];

            return (
              <div key={cat.key} className="bg-white border border-gray-200 rounded-lg p-5">
                {/* Category Header */}
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-bold text-sm text-gray-800">{cat.label}</h3>
                  <span className="text-xs text-gray-400">{tags.length} tags</span>
                </div>
                <p className="text-xs text-gray-500 mb-3">{questionText}</p>

                {/* Tag Chips */}
                <div className="flex flex-wrap gap-2 mb-3">
                  {tags.map((tag, idx) => (
                    <span
                      key={`${tag}-${idx}`}
                      className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium ${
                        cat.key === 'cons'
                          ? 'bg-orange-50 text-orange-700 border border-orange-200'
                          : 'bg-blue-50 text-blue-700 border border-blue-200'
                      }`}
                    >
                      {tag}
                      <button
                        onClick={() => removeTag(cat.key, idx)}
                        className="ml-0.5 hover:text-red-500 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}

                  {tags.length === 0 && (
                    <span className="text-xs text-gray-300 italic">No tags yet — add some or load defaults</span>
                  )}
                </div>

                {/* Add Tag Input */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300 placeholder-gray-300"
                    placeholder={locale === 'zh' ? '輸入新標籤...' : 'Add a new tag...'}
                    value={newTagInputs[cat.key] || ''}
                    onChange={(e) => setNewTagInputs(prev => ({ ...prev, [cat.key]: e.target.value }))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addTag(cat.key);
                      }
                    }}
                  />
                  <button
                    onClick={() => addTag(cat.key)}
                    className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    <Plus className="w-4 h-4 text-gray-600" />
                  </button>
                </div>
              </div>
            );
          })}

          {/* Bottom Save Button */}
          {hasChanges && (
            <div className="flex justify-end pt-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg shadow hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 transition-colors"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : 'Save All Tags'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
