'use client';

import { useState, useEffect } from 'react';
import { FlaskConical, Play, Pause, CheckCircle, Plus } from 'lucide-react';
import { PRESET_EXPERIMENTS, type ABVariant } from '@/lib/ab-testing';

interface ABResult {
  variantId: string;
  label: string;
  totalReplies: number;
  avgRating: number;
  approvedCount: number;
  publishedCount: number;
  approvalRate: number;
}

interface Experiment {
  id: string;
  name: string;
  status: 'active' | 'paused' | 'completed';
  store_id: number | null;
  variants: ABVariant[];
  results: ABResult[];
  created_at: string;
  ended_at: string | null;
}

export default function ExperimentsDashboard() {
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [selectedPreset, setSelectedPreset] = useState(0);

  useEffect(() => { fetchExperiments(); }, []);

  const fetchExperiments = async () => {
    try {
      const res = await fetch('/api/admin/experiments');
      const data = await res.json();
      setExperiments(data.experiments || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const createExperiment = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const preset = PRESET_EXPERIMENTS[selectedPreset];
      await fetch('/api/admin/experiments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName.trim(),
          variants: preset.variants,
        }),
      });
      setShowCreate(false);
      setNewName('');
      fetchExperiments();
    } catch (err) {
      console.error(err);
    } finally {
      setCreating(false);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    await fetch('/api/admin/experiments', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    });
    fetchExperiments();
  };

  if (loading) return <div className="p-8 text-gray-400">Loading experiments...</div>;

  const statusColors: Record<string, string> = {
    active: 'bg-green-100 text-green-700',
    paused: 'bg-yellow-100 text-yellow-700',
    completed: 'bg-gray-100 text-gray-600',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-end">
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" /> New Experiment
        </button>
      </div>

      {/* Experiments List */}
      {experiments.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-lg border border-gray-200">
          <FlaskConical className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-700 mb-1">No Experiments Yet</h3>
          <p className="text-sm text-gray-400 max-w-md mx-auto mb-4">
            Create an A/B experiment to test different reply tones. The system will randomly assign variants and track results.
          </p>
          <button
            onClick={() => setShowCreate(true)}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
          >
            Create First Experiment
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {experiments.map(exp => {
            const totalReplies = exp.results.reduce((s, r) => s + r.totalReplies, 0);
            const winner = exp.results.length > 0
              ? exp.results.reduce((best, r) => r.publishedCount > best.publishedCount ? r : best, exp.results[0])
              : null;

            return (
              <div key={exp.id} className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-bold text-gray-800">{exp.name}</h3>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColors[exp.status]}`}>
                        {exp.status}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      {totalReplies} replies tracked | Created {new Date(exp.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {exp.status === 'active' && (
                      <>
                        <button
                          onClick={() => updateStatus(exp.id, 'paused')}
                          className="flex items-center gap-1 px-3 py-1.5 text-xs border border-yellow-300 text-yellow-700 rounded-lg hover:bg-yellow-50"
                        >
                          <Pause className="w-3 h-3" /> Pause
                        </button>
                        <button
                          onClick={() => updateStatus(exp.id, 'completed')}
                          className="flex items-center gap-1 px-3 py-1.5 text-xs border border-green-300 text-green-700 rounded-lg hover:bg-green-50"
                        >
                          <CheckCircle className="w-3 h-3" /> End
                        </button>
                      </>
                    )}
                    {exp.status === 'paused' && (
                      <button
                        onClick={() => updateStatus(exp.id, 'active')}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs border border-green-300 text-green-700 rounded-lg hover:bg-green-50"
                      >
                        <Play className="w-3 h-3" /> Resume
                      </button>
                    )}
                  </div>
                </div>

                {/* Results Table */}
                {exp.results.length > 0 && totalReplies > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200 text-left text-gray-500">
                          <th className="pb-2 font-medium">Variant</th>
                          <th className="pb-2 font-medium text-center">Replies</th>
                          <th className="pb-2 font-medium text-center">Published</th>
                          <th className="pb-2 font-medium text-center">Approval Rate</th>
                          <th className="pb-2 font-medium text-center">Winner</th>
                        </tr>
                      </thead>
                      <tbody>
                        {exp.results.map(r => (
                          <tr key={r.variantId} className="border-b border-gray-100">
                            <td className="py-3 font-medium text-gray-800">{r.label}</td>
                            <td className="py-3 text-center text-gray-600">{r.totalReplies}</td>
                            <td className="py-3 text-center text-gray-600">{r.publishedCount}</td>
                            <td className="py-3 text-center">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                                r.approvalRate >= 80 ? 'bg-green-100 text-green-700' :
                                r.approvalRate >= 50 ? 'bg-yellow-100 text-yellow-700' :
                                'bg-gray-100 text-gray-600'
                              }`}>
                                {r.approvalRate}%
                              </span>
                            </td>
                            <td className="py-3 text-center">
                              {winner && winner.variantId === r.variantId && totalReplies >= 10 ? (
                                <span className="text-green-600 font-bold text-xs">&#x1F3C6;</span>
                              ) : null}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-6 bg-gray-50 rounded-lg text-sm text-gray-400">
                    No data yet. Results will appear as reviews are processed with this experiment.
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-bold text-gray-800">New A/B Experiment</h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Experiment Name</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  placeholder="e.g. Formal vs Casual — March 2026"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Preset</label>
                <div className="space-y-2">
                  {PRESET_EXPERIMENTS.map((preset, i) => (
                    <button
                      key={i}
                      onClick={() => setSelectedPreset(i)}
                      className={`w-full text-left p-3 rounded-lg border text-sm transition-colors ${
                        selectedPreset === i
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <span className="font-medium text-gray-800">{preset.name}</span>
                      <div className="flex gap-2 mt-1">
                        {preset.variants.map(v => (
                          <span key={v.id} className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                            {v.label}
                          </span>
                        ))}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setShowCreate(false)}
                className="px-4 py-2 text-sm text-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={createExperiment}
                disabled={creating || !newName.trim()}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {creating ? 'Creating...' : 'Create Experiment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
