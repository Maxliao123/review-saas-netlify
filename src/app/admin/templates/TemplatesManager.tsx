'use client';

import { useState, useEffect } from 'react';

interface Template {
  id: string;
  name: string;
  category: string;
  min_rating: number;
  max_rating: number;
  vertical: string | null;
  language: string;
  body: string;
  variables: Array<{ key: string; label: string; default?: string }>;
  is_active: boolean;
  use_count: number;
  created_at: string;
}

const CATEGORIES = [
  'general', 'positive', 'negative', 'neutral',
  'food_quality', 'service', 'ambiance', 'value',
  'cleanliness', 'wait_time', 'thank_you',
];

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'zh', label: '繁體中文' },
  { code: 'ko', label: '한국어' },
  { code: 'ja', label: '日本語' },
  { code: 'fr', label: 'Français' },
  { code: 'es', label: 'Español' },
];

const VERTICALS = [
  { value: '', label: 'All Verticals' },
  { value: 'restaurant', label: 'Restaurant' },
  { value: 'medical', label: 'Medical' },
  { value: 'hotel', label: 'Hotel' },
  { value: 'auto_repair', label: 'Auto Repair' },
  { value: 'salon', label: 'Salon' },
  { value: 'retail', label: 'Retail' },
  { value: 'fitness', label: 'Fitness' },
];

const STARTER_TEMPLATES = [
  {
    name: '5-Star Thank You',
    category: 'positive',
    min_rating: 5, max_rating: 5,
    language: 'en',
    body: 'Thank you so much for the wonderful 5-star review, {{author_name}}! We\'re thrilled you had a great experience at {{store_name}}. Your kind words mean the world to our team. We look forward to welcoming you back soon!',
  },
  {
    name: '4-Star Appreciation',
    category: 'positive',
    min_rating: 4, max_rating: 4,
    language: 'en',
    body: 'Thank you for the great review, {{author_name}}! We\'re glad you enjoyed your visit to {{store_name}}. We\'re always working to make every experience a 5-star one. Hope to see you again soon!',
  },
  {
    name: 'Negative Review - Apologize',
    category: 'negative',
    min_rating: 1, max_rating: 2,
    language: 'en',
    body: 'We sincerely apologize for your experience, {{author_name}}. This is not the standard we hold ourselves to at {{store_name}}. We\'d love the opportunity to make things right. Please reach out to us directly so we can address your concerns.',
  },
  {
    name: '五星好評感謝',
    category: 'positive',
    min_rating: 5, max_rating: 5,
    language: 'zh',
    body: '非常感謝您的五星好評！我們很高興您在本店有了愉快的體驗。您的肯定是我們最大的動力，期待下次再為您服務！',
  },
];

export default function TemplatesManager() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [editing, setEditing] = useState<Template | null>(null);
  const [saving, setSaving] = useState(false);
  const [filterLang, setFilterLang] = useState<string>('');
  const [filterCategory, setFilterCategory] = useState<string>('');

  // Form state
  const [form, setForm] = useState({
    name: '',
    category: 'general',
    min_rating: 1,
    max_rating: 5,
    vertical: '',
    language: 'en',
    body: '',
  });

  useEffect(() => { fetchTemplates(); }, []);

  const fetchTemplates = async () => {
    try {
      const params = new URLSearchParams({ active: 'false' });
      if (filterLang) params.set('language', filterLang);
      if (filterCategory) params.set('category', filterCategory);

      const res = await fetch(`/api/admin/templates?${params}`);
      if (res.status === 403) {
        setError('upgrade');
        return;
      }
      if (!res.ok) throw new Error('Failed to fetch templates');
      const data = await res.json();
      setTemplates(data.templates || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const openNew = () => {
    setEditing(null);
    setForm({ name: '', category: 'general', min_rating: 1, max_rating: 5, vertical: '', language: 'en', body: '' });
    setShowEditor(true);
  };

  const openEdit = (t: Template) => {
    setEditing(t);
    setForm({
      name: t.name,
      category: t.category,
      min_rating: t.min_rating,
      max_rating: t.max_rating,
      vertical: t.vertical || '',
      language: t.language,
      body: t.body,
    });
    setShowEditor(true);
  };

  const saveTemplate = async () => {
    if (!form.name.trim() || !form.body.trim()) return;
    setSaving(true);
    try {
      const payload = {
        ...form,
        vertical: form.vertical || null,
      };

      let res;
      if (editing) {
        res = await fetch(`/api/admin/templates/${editing.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch('/api/admin/templates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to save');
      }

      setShowEditor(false);
      fetchTemplates();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (t: Template) => {
    await fetch(`/api/admin/templates/${t.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !t.is_active }),
    });
    fetchTemplates();
  };

  const deleteTemplate = async (t: Template) => {
    if (!confirm(`Delete template "${t.name}"?`)) return;
    await fetch(`/api/admin/templates/${t.id}`, { method: 'DELETE' });
    fetchTemplates();
  };

  const addStarterTemplates = async () => {
    setSaving(true);
    try {
      for (const starter of STARTER_TEMPLATES) {
        await fetch('/api/admin/templates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(starter),
        });
      }
      fetchTemplates();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Upgrade gate
  if (error === 'upgrade') {
    return (
      <div className="text-center py-16">
        <div className="text-5xl mb-4">&#128221;</div>
        <h3 className="text-xl font-bold text-gray-800 mb-2">Reply Templates</h3>
        <p className="text-gray-500 mb-6 max-w-md mx-auto">
          Pre-built reply templates reduce AI costs and speed up auto-replies for common patterns. Available on Pro plan and above.
        </p>
        <a
          href="/admin/settings/billing"
          className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
        >
          Upgrade to Pro
        </a>
      </div>
    );
  }

  if (loading) return <div className="p-8 text-gray-500">Loading templates...</div>;
  if (error) return <div className="p-8 text-red-500">Error: {error}</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Filters */}
          <select
            value={filterLang}
            onChange={(e) => { setFilterLang(e.target.value); setTimeout(fetchTemplates, 0); }}
            className="text-sm border border-gray-300 rounded-lg px-3 py-2"
          >
            <option value="">All Languages</option>
            {LANGUAGES.map(l => (
              <option key={l.code} value={l.code}>{l.label}</option>
            ))}
          </select>
          <select
            value={filterCategory}
            onChange={(e) => { setFilterCategory(e.target.value); setTimeout(fetchTemplates, 0); }}
            className="text-sm border border-gray-300 rounded-lg px-3 py-2"
          >
            <option value="">All Categories</option>
            {CATEGORIES.map(c => (
              <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-3">
          {templates.length === 0 && (
            <button
              onClick={addStarterTemplates}
              disabled={saving}
              className="px-4 py-2 text-sm border border-blue-300 text-blue-600 rounded-lg hover:bg-blue-50 disabled:opacity-50"
            >
              {saving ? 'Adding...' : 'Add Starter Templates'}
            </button>
          )}
          <button
            onClick={openNew}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            + New Template
          </button>
        </div>
      </div>

      {/* Templates Grid */}
      {templates.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-lg border border-gray-200">
          <div className="text-5xl mb-4">&#128196;</div>
          <h3 className="text-lg font-bold text-gray-700 mb-2">No Templates Yet</h3>
          <p className="text-sm text-gray-500 mb-6 max-w-md mx-auto">
            Create reply templates to speed up responses and reduce AI costs. Templates are matched by rating, language, and category.
          </p>
          <button
            onClick={addStarterTemplates}
            disabled={saving}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Adding...' : 'Add Starter Templates'}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {templates.map(t => (
            <div
              key={t.id}
              className={`bg-white rounded-lg border p-5 ${
                t.is_active ? 'border-gray-200' : 'border-gray-100 opacity-60'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-gray-800">{t.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                      {t.category.replace(/_/g, ' ')}
                    </span>
                    <span className="text-xs text-gray-400">
                      {t.min_rating === t.max_rating ? `${t.min_rating}★` : `${t.min_rating}-${t.max_rating}★`}
                    </span>
                    <span className="text-xs text-gray-400">
                      {LANGUAGES.find(l => l.code === t.language)?.label || t.language}
                    </span>
                    {t.vertical && (
                      <span className="text-xs text-gray-400">{t.vertical}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-gray-400 mr-2">
                    {t.use_count} uses
                  </span>
                  <button
                    onClick={() => toggleActive(t)}
                    className={`px-2 py-1 text-xs rounded ${
                      t.is_active
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {t.is_active ? 'Active' : 'Inactive'}
                  </button>
                </div>
              </div>

              <div className="text-sm text-gray-600 bg-gray-50 rounded p-3 mb-3 line-clamp-3 font-mono text-xs leading-relaxed">
                {t.body}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => openEdit(t)}
                  className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                >
                  Edit
                </button>
                <button
                  onClick={() => deleteTemplate(t)}
                  className="text-xs text-red-500 hover:text-red-700 font-medium"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Editor Modal */}
      {showEditor && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-bold text-gray-800">
                {editing ? 'Edit Template' : 'New Template'}
              </h2>
            </div>

            <div className="p-6 space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Template Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  placeholder="e.g. 5-Star Thank You"
                />
              </div>

              {/* Category + Language */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm(f => ({ ...f, category: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  >
                    {CATEGORIES.map(c => (
                      <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Language</label>
                  <select
                    value={form.language}
                    onChange={(e) => setForm(f => ({ ...f, language: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  >
                    {LANGUAGES.map(l => (
                      <option key={l.code} value={l.code}>{l.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Rating Range */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Min Rating</label>
                  <select
                    value={form.min_rating}
                    onChange={(e) => setForm(f => ({ ...f, min_rating: Number(e.target.value) }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  >
                    {[1,2,3,4,5].map(r => (
                      <option key={r} value={r}>{r} Star{r > 1 ? 's' : ''}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Max Rating</label>
                  <select
                    value={form.max_rating}
                    onChange={(e) => setForm(f => ({ ...f, max_rating: Number(e.target.value) }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  >
                    {[1,2,3,4,5].map(r => (
                      <option key={r} value={r}>{r} Star{r > 1 ? 's' : ''}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Vertical */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Business Vertical</label>
                <select
                  value={form.vertical}
                  onChange={(e) => setForm(f => ({ ...f, vertical: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                >
                  {VERTICALS.map(v => (
                    <option key={v.value} value={v.value}>{v.label}</option>
                  ))}
                </select>
              </div>

              {/* Template Body */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reply Template
                </label>
                <textarea
                  value={form.body}
                  onChange={(e) => setForm(f => ({ ...f, body: e.target.value }))}
                  rows={5}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono"
                  placeholder="Thank you for your {{rating}}-star review, {{author_name}}! We're so glad you loved {{store_name}}..."
                />
                <p className="text-xs text-gray-400 mt-1">
                  Available variables: <code className="bg-gray-100 px-1 rounded">{'{{store_name}}'}</code>{' '}
                  <code className="bg-gray-100 px-1 rounded">{'{{author_name}}'}</code>{' '}
                  <code className="bg-gray-100 px-1 rounded">{'{{rating}}'}</code>
                </p>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setShowEditor(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={saveTemplate}
                disabled={saving || !form.name.trim() || !form.body.trim()}
                className="px-6 py-2 text-sm bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : editing ? 'Save Changes' : 'Create Template'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
