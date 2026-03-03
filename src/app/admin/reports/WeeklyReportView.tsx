'use client';

import { useState } from 'react';
import { TrendingUp, TrendingDown, Minus, Star, MessageSquare, QrCode, FileText } from 'lucide-react';

interface Store {
  id: number;
  name: string;
}

interface Report {
  id: number;
  store_id: number;
  report_week: string;
  data: any;
  delivered_via: string[];
}

export default function WeeklyReportView({ reports, stores }: { reports: Report[]; stores: Store[] }) {
  const [selectedReport, setSelectedReport] = useState<Report | null>(reports[0] || null);

  const storeMap = stores.reduce((acc, s) => {
    acc[s.id] = s.name;
    return acc;
  }, {} as Record<number, string>);

  if (reports.length === 0) {
    return (
      <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
        <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500">No reports generated yet.</p>
        <p className="text-sm text-gray-400 mt-1">Reports are generated every Monday at 9:00 AM PST.</p>
      </div>
    );
  }

  const data = selectedReport?.data;
  const TrendIcon = data?.reviews?.vs_last_week?.rating_trend === 'up' ? TrendingUp
    : data?.reviews?.vs_last_week?.rating_trend === 'down' ? TrendingDown
    : Minus;
  const trendColor = data?.reviews?.vs_last_week?.rating_trend === 'up' ? 'text-green-600'
    : data?.reviews?.vs_last_week?.rating_trend === 'down' ? 'text-red-600'
    : 'text-gray-400';

  return (
    <div className="space-y-6">
      {/* Report Selector */}
      <div className="flex gap-2 flex-wrap">
        {reports.map(report => (
          <button
            key={report.id}
            onClick={() => setSelectedReport(report)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedReport?.id === report.id
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {storeMap[report.store_id] || 'Store'} - {report.report_week}
          </button>
        ))}
      </div>

      {data && (
        <>
          {/* Header */}
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  {storeMap[selectedReport!.store_id]} - Week of {data.period.start}
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  {data.period.start} to {data.period.end}
                  {selectedReport!.delivered_via?.length > 0 && (
                    <span className="ml-2 text-green-600">
                      Delivered via: {selectedReport!.delivered_via.join(', ')}
                    </span>
                  )}
                </p>
              </div>
              <TrendIcon className={`w-8 h-8 ${trendColor}`} />
            </div>
          </div>

          {/* Metric Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard
              icon={Star}
              label="Avg Rating"
              value={data.reviews.avg_rating.toString()}
              sub={`${data.reviews.vs_last_week.volume_change_pct >= 0 ? '+' : ''}${data.reviews.vs_last_week.volume_change_pct}% volume`}
              color={data.reviews.avg_rating >= 4 ? 'green' : data.reviews.avg_rating >= 3 ? 'yellow' : 'red'}
            />
            <MetricCard
              icon={MessageSquare}
              label="New Reviews"
              value={data.reviews.total_new.toString()}
              sub={`${data.reviews.negative_count} negative`}
            />
            <MetricCard
              icon={MessageSquare}
              label="Reply Rate"
              value={`${data.replies.reply_rate_pct}%`}
              sub={`${data.replies.total_replied} replied`}
            />
            <MetricCard
              icon={QrCode}
              label="Total Scans"
              value={data.scans.total.toString()}
              sub={`QR: ${data.scans.by_source?.qr || 0} | NFC: ${data.scans.by_source?.nfc || 0}`}
            />
          </div>

          {/* Complaints + Generation */}
          <div className="grid md:grid-cols-2 gap-6">
            {data.top_complaints?.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-xl p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Top Complaint Categories</h3>
                <div className="space-y-3">
                  {data.top_complaints.map((c: any) => (
                    <div key={c.category} className="flex items-center justify-between">
                      <span className="text-sm text-gray-700">{c.category}</span>
                      <span className="text-sm font-medium text-red-600">{c.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Review Generation</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">Generated</span>
                  <span className="text-sm font-medium">{data.generation.reviews_generated}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">Likely Posted</span>
                  <span className="text-sm font-medium text-green-600">{data.generation.likely_posted}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">Conversion Rate</span>
                  <span className="text-sm font-medium">{data.generation.conversion_rate_pct}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Rating Distribution */}
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Rating Distribution</h3>
            <div className="space-y-2">
              {[5, 4, 3, 2, 1].map(star => {
                const count = data.reviews.rating_distribution[star] || 0;
                const pct = data.reviews.total_new > 0 ? (count / data.reviews.total_new) * 100 : 0;
                return (
                  <div key={star} className="flex items-center gap-3">
                    <span className="text-sm text-gray-600 w-12">{star} star</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-3">
                      <div
                        className={`h-3 rounded-full ${star >= 4 ? 'bg-green-500' : star === 3 ? 'bg-yellow-500' : 'bg-red-500'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-sm text-gray-500 w-8 text-right">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, sub, color }: {
  icon: any;
  label: string;
  value: string;
  sub?: string;
  color?: string;
}) {
  const valueColor = color === 'green' ? 'text-green-600' : color === 'red' ? 'text-red-600' : color === 'yellow' ? 'text-yellow-600' : 'text-gray-900';

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4 text-gray-400" />
        <span className="text-xs font-medium text-gray-500">{label}</span>
      </div>
      <p className={`text-2xl font-bold ${valueColor}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}
