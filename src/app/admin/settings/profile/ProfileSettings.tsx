'use client';

import { useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'zh', label: '中文' },
  { code: 'ko', label: '한국어' },
  { code: 'ja', label: '日本語' },
  { code: 'fr', label: 'Français' },
  { code: 'es', label: 'Español' },
];

export default function ProfileSettings({
  user,
  initialLang,
}: {
  user: { id: string; email?: string };
  initialLang: string;
}) {
  const [lang, setLang] = useState(initialLang);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const supabase = createSupabaseBrowserClient();

  async function handleSave() {
    setSaving(true);
    const { error } = await supabase.auth.updateUser({
      data: { preferred_language: lang },
    });
    if (error) {
      setMessage('Failed to save: ' + error.message);
    } else {
      setMessage('Preferences saved!');
    }
    setSaving(false);
    setTimeout(() => setMessage(''), 3000);
  }

  return (
    <div className="space-y-6">
      {message && (
        <div className={`p-3 rounded-lg text-sm ${message.includes('Failed') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
          {message}
        </div>
      )}

      {/* Account Info */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Account</h3>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Email</label>
            <p className="text-sm text-gray-900">{user.email}</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">User ID</label>
            <p className="text-xs text-gray-400 font-mono">{user.id}</p>
          </div>
        </div>
      </div>

      {/* Language Preference */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h3 className="font-semibold text-gray-900 mb-1">Preferred Language</h3>
        <p className="text-xs text-gray-500 mb-4">
          This sets the default language for AI-generated reviews and notifications.
        </p>
        <div className="grid grid-cols-3 gap-2">
          {LANGUAGES.map((l) => (
            <button
              key={l.code}
              onClick={() => setLang(l.code)}
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                lang === l.code
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
      >
        {saving ? 'Saving...' : 'Save Preferences'}
      </button>
    </div>
  );
}
