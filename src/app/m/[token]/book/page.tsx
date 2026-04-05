'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

interface Service {
  id: string;
  name: string;
  duration_minutes: number;
  price: number;
  credits_required: number;
  description: string;
}

interface StaffSlot {
  id: string;
  name: string;
  avatar_url: string | null;
  slots: Array<{ time: string; start_time: string; end_time: string; available: boolean }>;
}

interface BookingResult {
  booking: {
    id: string;
    start_time: string;
    end_time: string;
    verification_code: string;
    status: string;
  };
  service_name: string;
}

type Step = 'service' | 'date' | 'staff' | 'confirm' | 'done';

export default function BookingPage() {
  const { token } = useParams<{ token: string }>();

  const [step, setStep] = useState<Step>('service');
  const [services, setServices] = useState<Service[]>([]);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [staffList, setStaffList] = useState<StaffSlot[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<StaffSlot | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<BookingResult | null>(null);
  const [error, setError] = useState('');

  // Generate next 14 days
  const dates = Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return d.toISOString().split('T')[0];
  });

  // Load services
  useEffect(() => {
    setLoading(true);
    fetch(`/api/member/${token}/book`)
      .then((r) => r.json())
      .then((d) => setServices(d.services || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [token]);

  // Load staff when service + date selected
  useEffect(() => {
    if (!selectedService || !selectedDate) return;
    setLoading(true);
    setStaffList([]);
    fetch(`/api/member/${token}/book?service_id=${selectedService.id}&date=${selectedDate}`)
      .then((r) => r.json())
      .then((d) => setStaffList(d.staff || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [token, selectedService, selectedDate]);

  function handleSelectService(s: Service) {
    setSelectedService(s);
    setStep('date');
  }

  function handleSelectDate(d: string) {
    setSelectedDate(d);
    setStep('staff');
  }

  function handleSelectSlot(staff: StaffSlot, startTime: string) {
    setSelectedStaff(staff);
    setSelectedSlot(startTime);
    setStep('confirm');
  }

  async function handleConfirm() {
    if (!selectedService || !selectedStaff || !selectedSlot) return;
    setSubmitting(true);
    setError('');

    try {
      const res = await fetch(`/api/member/${token}/book`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service_id: selectedService.id,
          staff_id: selectedStaff.id,
          start_time: selectedSlot,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Booking failed');
      setResult(data);
      setStep('done');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  }

  function handleBack() {
    if (step === 'date') { setStep('service'); setSelectedService(null); }
    else if (step === 'staff') { setStep('date'); setSelectedDate(''); }
    else if (step === 'confirm') { setStep('staff'); setSelectedSlot(''); setSelectedStaff(null); }
  }

  // Progress indicator
  const steps: Step[] = ['service', 'date', 'staff', 'confirm'];
  const currentIdx = steps.indexOf(step);

  return (
    <div className="p-4">
      {/* Step indicator */}
      {step !== 'done' && (
        <div className="flex items-center mb-6">
          {step !== 'service' && (
            <button onClick={handleBack} className="mr-3 text-gray-500 p-1">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
              </svg>
            </button>
          )}
          <div className="flex-1 flex gap-1">
            {steps.map((s, i) => (
              <div
                key={s}
                className={`h-1 flex-1 rounded-full ${
                  i <= currentIdx ? 'bg-[#E8654A]' : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
        </div>
      )}

      {/* Step: Service */}
      {step === 'service' && (
        <div>
          <h2 className="text-lg font-bold text-gray-900 mb-4">Select a Service</h2>
          {loading ? (
            <Spinner />
          ) : (
            <div className="space-y-3">
              {services.map((s) => (
                <button
                  key={s.id}
                  onClick={() => handleSelectService(s)}
                  className="w-full text-left bg-white rounded-xl p-4 shadow-sm border border-gray-100 active:bg-gray-50 transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold text-gray-900">{s.name}</p>
                      <p className="text-sm text-gray-500 mt-0.5">{s.duration_minutes} min</p>
                    </div>
                    <div className="text-right">
                      {s.credits_required ? (
                        <span className="text-sm font-medium text-[#E8654A]">
                          {s.credits_required} credit{s.credits_required > 1 ? 's' : ''}
                        </span>
                      ) : (
                        <span className="text-sm font-medium text-gray-900">
                          ${s.price}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
              {services.length === 0 && (
                <p className="text-center text-gray-400 text-sm py-8">No services available</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Step: Date */}
      {step === 'date' && (
        <div>
          <h2 className="text-lg font-bold text-gray-900 mb-1">Pick a Date</h2>
          <p className="text-sm text-gray-500 mb-4">{selectedService?.name}</p>
          <div className="grid grid-cols-3 gap-2">
            {dates.map((d) => {
              const dt = new Date(d + 'T12:00:00');
              const isToday = d === new Date().toISOString().split('T')[0];
              return (
                <button
                  key={d}
                  onClick={() => handleSelectDate(d)}
                  className={`p-3 rounded-xl text-center border transition-colors active:scale-95 ${
                    selectedDate === d
                      ? 'bg-[#E8654A] text-white border-[#E8654A]'
                      : 'bg-white border-gray-100 text-gray-700'
                  }`}
                >
                  <div className="text-xs">
                    {isToday ? 'Today' : dt.toLocaleDateString('en-US', { weekday: 'short' })}
                  </div>
                  <div className="text-lg font-bold">{dt.getDate()}</div>
                  <div className="text-xs">{dt.toLocaleDateString('en-US', { month: 'short' })}</div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Step: Staff + Time */}
      {step === 'staff' && (
        <div>
          <h2 className="text-lg font-bold text-gray-900 mb-1">Pick a Time</h2>
          <p className="text-sm text-gray-500 mb-4">
            {selectedService?.name} &middot; {formatDateShort(selectedDate)}
          </p>
          {loading ? (
            <Spinner />
          ) : staffList.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-8">No availability on this date</p>
          ) : (
            <div className="space-y-5">
              {staffList.map((staff) => (
                <div key={staff.id}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 bg-[#E8654A] text-white rounded-full flex items-center justify-center text-sm font-semibold">
                      {staff.name.charAt(0)}
                    </div>
                    <span className="font-medium text-gray-900">{staff.name}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {staff.slots.map((slot) => (
                      <button
                        key={slot.start_time}
                        onClick={() => handleSelectSlot(staff, slot.start_time)}
                        className="px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg active:bg-orange-50 active:border-[#E8654A] transition-colors"
                      >
                        {slot.time}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Step: Confirm */}
      {step === 'confirm' && (
        <div>
          <h2 className="text-lg font-bold text-gray-900 mb-4">Confirm Booking</h2>
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 space-y-3 mb-6">
            <Row label="Service" value={selectedService?.name || ''} />
            <Row label="Staff" value={selectedStaff?.name || ''} />
            <Row label="Date" value={formatDateShort(selectedDate)} />
            <Row label="Time" value={formatTime(selectedSlot)} />
            <Row label="Duration" value={`${selectedService?.duration_minutes} min`} />
            {selectedService?.credits_required ? (
              <Row label="Credits" value={`${selectedService.credits_required}`} />
            ) : (
              <Row label="Price" value={`$${selectedService?.price}`} />
            )}
          </div>
          {error && (
            <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg mb-4">{error}</div>
          )}
          <button
            onClick={handleConfirm}
            disabled={submitting}
            className="w-full bg-[#E8654A] text-white font-semibold py-3 rounded-xl shadow-sm disabled:opacity-50 active:scale-95 transition-transform"
          >
            {submitting ? 'Booking...' : 'Confirm Booking'}
          </button>
        </div>
      )}

      {/* Step: Done */}
      {step === 'done' && result && (
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Booking Confirmed!</h2>
          <p className="text-sm text-gray-500 mb-6">{result.service_name}</p>

          <div className="bg-orange-50 rounded-xl p-6 mb-6 inline-block">
            <div className="text-xs text-gray-500 mb-1">Your Check-in Code</div>
            <div className="text-4xl font-mono font-bold text-[#E8654A]">
              {result.booking.verification_code}
            </div>
          </div>

          <p className="text-sm text-gray-500 mb-6">
            Show this code when you arrive for your appointment.
          </p>

          <Link
            href={`/m/${token}`}
            className="inline-block bg-[#E8654A] text-white font-semibold px-6 py-3 rounded-xl active:scale-95 transition-transform"
          >
            Back to Home
          </Link>
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm font-medium text-gray-900">{value}</span>
    </div>
  );
}

function Spinner() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="w-8 h-8 border-2 border-[#E8654A] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function formatDateShort(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function formatTime(iso: string): string {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}
