'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

interface MemberData {
  member: { id: string; name: string; phone: string; points_balance: number };
  store: { id: number; name: string; place_id: string };
  upcoming_bookings: Array<{
    id: string;
    start_time: string;
    end_time: string;
    status: string;
    verification_code: string;
    services: { id: string; name: string; duration_minutes: number; price: number };
    staff: { id: string; name: string };
  }>;
  credit_packages: Array<{
    id: string;
    remaining: number;
    total: number;
    credit_packages: { id: string; name: string; session_count: number; price: number };
  }>;
}

export default function MemberHomePage() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<MemberData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/member/${token}`)
      .then((r) => r.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-[#E8654A] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6 text-center text-gray-500">Unable to load member data.</div>
    );
  }

  const { member, upcoming_bookings, credit_packages } = data;
  const nextBooking = upcoming_bookings[0];

  return (
    <div className="p-4 space-y-5">
      {/* Greeting */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">
          Hi, {member.name}!
        </h2>
        <p className="text-sm text-gray-500 mt-1">Welcome back</p>
      </div>

      {/* Next Booking */}
      {nextBooking ? (
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="text-xs font-medium text-[#E8654A] uppercase tracking-wide mb-2">
            Next Appointment
          </div>
          <div className="flex justify-between items-start">
            <div>
              <p className="font-semibold text-gray-900">
                {nextBooking.services?.name}
              </p>
              <p className="text-sm text-gray-500">
                with {nextBooking.staff?.name}
              </p>
              <p className="text-sm text-gray-600 mt-1">
                {formatDate(nextBooking.start_time)} at{' '}
                {formatTime(nextBooking.start_time)}
              </p>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-400 mb-1">Check-in Code</div>
              <div className="text-2xl font-mono font-bold text-[#E8654A] bg-orange-50 px-3 py-1 rounded-lg">
                {nextBooking.verification_code}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-center text-gray-400 text-sm">
          No upcoming appointments
        </div>
      )}

      {/* Credit Packages */}
      {credit_packages.length > 0 && (
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
            My Packages
          </div>
          <div className="space-y-3">
            {credit_packages.map((cp) => (
              <div key={cp.id}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium text-gray-900">
                    {cp.credit_packages?.name || 'Package'}
                  </span>
                  <span className="text-gray-500">
                    {cp.remaining}/{cp.total} left
                  </span>
                </div>
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#E8654A] rounded-full transition-all"
                    style={{ width: `${(cp.remaining / cp.total) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Points */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex items-center justify-between">
        <div>
          <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            Points Balance
          </div>
          <div className="text-2xl font-bold text-gray-900 mt-1">
            {member.points_balance}
          </div>
        </div>
        <div className="w-12 h-12 bg-orange-50 rounded-full flex items-center justify-center">
          <svg className="w-6 h-6 text-[#E8654A]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" />
          </svg>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3">
        <Link
          href={`/m/${token}/book`}
          className="bg-[#E8654A] text-white font-semibold text-center py-3 rounded-xl shadow-sm active:scale-95 transition-transform"
        >
          Book Now
        </Link>
        <Link
          href={`/m/${token}/history`}
          className="bg-white text-gray-700 font-semibold text-center py-3 rounded-xl shadow-sm border border-gray-200 active:scale-95 transition-transform"
        >
          View History
        </Link>
      </div>
    </div>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}
