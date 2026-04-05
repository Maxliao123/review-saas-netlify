'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

interface Booking {
  id: string;
  start_time: string;
  end_time: string;
  status: string;
  verification_code: string;
  services: { id: string; name: string; duration_minutes: number; price: number } | null;
  staff: { id: string; name: string } | null;
}

export default function HistoryPage() {
  const { token } = useParams<{ token: string }>();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/member/${token}`)
      .then((r) => r.json())
      .then((data) => {
        // We get upcoming_bookings from the main endpoint; for history
        // we fetch all bookings via a dedicated call below
        setBookings(data.upcoming_bookings || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));

    // Fetch past bookings
    fetch(`/api/member/${token}/history`)
      .then((r) => r.json())
      .then((data) => {
        if (data.bookings) setBookings(data.bookings);
      })
      .catch(() => {
        // history endpoint may not exist yet; fall back to member data
      });
  }, [token]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-[#E8654A] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4">
      <h2 className="text-lg font-bold text-gray-900 mb-4">Booking History</h2>
      {bookings.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-400 text-sm mb-4">No bookings yet</p>
          <Link
            href={`/m/${token}/book`}
            className="inline-block bg-[#E8654A] text-white font-semibold px-6 py-3 rounded-xl active:scale-95 transition-transform"
          >
            Book Now
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {bookings.map((b) => {
            const isPast = new Date(b.start_time) < new Date();
            return (
              <div
                key={b.id}
                className="bg-white rounded-xl p-4 shadow-sm border border-gray-100"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold text-gray-900">
                      {b.services?.name || 'Service'}
                    </p>
                    <p className="text-sm text-gray-500">
                      {b.staff?.name ? `with ${b.staff.name}` : ''}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      {formatDate(b.start_time)} at {formatTime(b.start_time)}
                    </p>
                  </div>
                  <div className="text-right">
                    <span
                      className={`text-xs font-medium px-2 py-1 rounded-full ${
                        b.status === 'confirmed'
                          ? 'bg-green-50 text-green-700'
                          : b.status === 'completed'
                          ? 'bg-gray-100 text-gray-600'
                          : b.status === 'cancelled'
                          ? 'bg-red-50 text-red-600'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {b.status}
                    </span>
                    {isPast && b.status === 'completed' && (
                      <Link
                        href={`/m/${token}/feedback/${b.id}`}
                        className="block text-xs text-[#E8654A] font-medium mt-2"
                      >
                        Leave Feedback
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
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
