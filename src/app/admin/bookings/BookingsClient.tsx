'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  CalendarDays,
  Clock,
  User,
  Scissors,
  Users,
  BadgeCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Plus,
  ChevronLeft,
  ChevronRight,
  Hash,
} from 'lucide-react';

interface Booking {
  id: string;
  start_time: string;
  end_time: string;
  status: string;
  verification_code: string;
  verified_at: string | null;
  notes: string | null;
  member_name: string;
  member_phone: string;
  service_name: string;
  service_duration: number;
  staff_name: string;
}

const STATUS_CONFIG: Record<string, { icon: any; color: string; bg: string }> = {
  confirmed: { icon: BadgeCheck, color: 'text-blue-600', bg: 'bg-blue-50' },
  completed: { icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50' },
  cancelled: { icon: XCircle, color: 'text-gray-400', bg: 'bg-gray-50' },
  no_show: { icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50' },
};

export default function BookingsClient({
  bookings,
  storeCount,
}: {
  bookings: Booking[];
  storeCount: number;
}) {
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split('T')[0]
  );

  const isToday = selectedDate === new Date().toISOString().split('T')[0];

  function formatTime(iso: string) {
    return new Date(iso).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  }

  function navigateDate(dir: number) {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + dir);
    setSelectedDate(d.toISOString().split('T')[0]);
  }

  const confirmedCount = bookings.filter((b) => b.status === 'confirmed').length;
  const completedCount = bookings.filter((b) => b.status === 'completed').length;

  return (
    <>
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bookings</h1>
          <p className="mt-1 text-sm text-gray-500">
            {isToday ? "Today's schedule" : selectedDate} &middot; {bookings.length} booking{bookings.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Link
          href="/admin/bookings/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#E8654A] text-white rounded-lg text-sm font-medium hover:bg-[#D55A40] transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Booking
        </Link>
      </div>

      {/* Date Picker */}
      <div className="mb-6 flex items-center gap-3">
        <button
          onClick={() => navigateDate(-1)}
          className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
        >
          <ChevronLeft className="h-4 w-4 text-gray-600" />
        </button>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#E8654A]/20 focus:border-[#E8654A]"
        />
        <button
          onClick={() => navigateDate(1)}
          className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
        >
          <ChevronRight className="h-4 w-4 text-gray-600" />
        </button>
        {!isToday && (
          <button
            onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
            className="px-3 py-2 text-sm font-medium text-[#E8654A] hover:bg-[#FFF7ED] rounded-lg transition-colors"
          >
            Today
          </button>
        )}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-2xl font-bold text-gray-900">{bookings.length}</div>
          <div className="text-xs text-gray-500 mt-1">Total</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-2xl font-bold text-blue-600">{confirmedCount}</div>
          <div className="text-xs text-gray-500 mt-1">Awaiting</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-2xl font-bold text-green-600">{completedCount}</div>
          <div className="text-xs text-gray-500 mt-1">Completed</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-2xl font-bold text-red-500">
            {bookings.filter((b) => b.status === 'no_show').length}
          </div>
          <div className="text-xs text-gray-500 mt-1">No-show</div>
        </div>
      </div>

      {/* Booking Cards */}
      {bookings.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <CalendarDays className="h-10 w-10 mx-auto mb-3 text-gray-300" />
          <p className="text-gray-500 font-medium">No bookings for this day</p>
          <p className="text-sm text-gray-400 mt-1">Bookings will appear here once scheduled.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {bookings.map((b) => {
            const cfg = STATUS_CONFIG[b.status] || STATUS_CONFIG.confirmed;
            const StatusIcon = cfg.icon;
            return (
              <div
                key={b.id}
                className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-sm transition-shadow"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-900">
                        <Clock className="h-4 w-4 text-gray-400" />
                        {formatTime(b.start_time)}
                      </span>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium capitalize ${cfg.bg} ${cfg.color}`}>
                        <StatusIcon className="h-3 w-3" />
                        {b.status.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="mt-2 grid sm:grid-cols-3 gap-2 text-sm">
                      <div className="flex items-center gap-1.5 text-gray-700">
                        <User className="h-3.5 w-3.5 text-gray-400" />
                        {b.member_name}
                      </div>
                      <div className="flex items-center gap-1.5 text-gray-700">
                        <Scissors className="h-3.5 w-3.5 text-gray-400" />
                        {b.service_name} ({b.service_duration}min)
                      </div>
                      <div className="flex items-center gap-1.5 text-gray-700">
                        <Users className="h-3.5 w-3.5 text-gray-400" />
                        {b.staff_name}
                      </div>
                    </div>
                    <div className="mt-2 flex items-center gap-1.5 text-xs text-gray-400">
                      <Hash className="h-3 w-3" />
                      Code: <span className="font-mono font-medium text-gray-600">{b.verification_code}</span>
                    </div>
                  </div>
                  <div className="shrink-0">
                    {b.status === 'confirmed' && (
                      <Link
                        href={`/admin/verify?code=${b.verification_code}`}
                        className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#E8654A] text-white rounded-lg text-sm font-medium hover:bg-[#D55A40] transition-colors"
                      >
                        <BadgeCheck className="h-4 w-4" />
                        Check-in
                      </Link>
                    )}
                    {b.status === 'completed' && (
                      <div className="flex items-center gap-1.5 text-green-600">
                        <CheckCircle2 className="h-5 w-5" />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
