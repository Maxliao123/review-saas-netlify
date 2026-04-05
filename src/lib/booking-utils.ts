/**
 * Booking utility functions
 * - Available slots calculation
 * - Conflict checking
 * - Time slot generation
 */

import { createSupabaseAdmin } from '@/lib/supabase/admin';

interface TimeRange {
  start: string; // "09:00"
  end: string;   // "18:00"
}

interface BookingSlot {
  start_time: string; // ISO string
  end_time: string;
}

interface AvailableSlot {
  time: string;      // "09:00"
  start_time: string; // ISO string
  end_time: string;   // ISO string
  available: boolean;
}

/**
 * Get day of week key from date string
 */
function getDayKey(dateStr: string): string {
  const days = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  return days[new Date(dateStr).getDay()];
}

/**
 * Parse time range strings like "09:00-18:00" into TimeRange objects
 */
function parseTimeRanges(ranges: string[]): TimeRange[] {
  return ranges
    .filter(r => r.includes('-'))
    .map(r => {
      const [start, end] = r.split('-');
      return { start: start.trim(), end: end.trim() };
    });
}

/**
 * Generate time slots from working hours with given interval
 */
function generateSlots(ranges: TimeRange[], intervalMinutes: number): string[] {
  const slots: string[] = [];

  for (const range of ranges) {
    const [startH, startM] = range.start.split(':').map(Number);
    const [endH, endM] = range.end.split(':').map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    for (let m = startMinutes; m + intervalMinutes <= endMinutes; m += intervalMinutes) {
      const h = Math.floor(m / 60);
      const min = m % 60;
      slots.push(`${h.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`);
    }
  }

  return slots;
}

/**
 * Check if a time slot conflicts with existing bookings
 */
function isSlotConflicting(
  slotStart: Date,
  slotEnd: Date,
  existingBookings: BookingSlot[]
): boolean {
  return existingBookings.some(booking => {
    const bStart = new Date(booking.start_time);
    const bEnd = new Date(booking.end_time);
    return slotStart < bEnd && slotEnd > bStart;
  });
}

/**
 * Get available time slots for a staff member on a given date
 */
export async function getAvailableSlots(
  staffId: string,
  storeId: number,
  date: string, // "2026-04-10"
  durationMinutes: number,
  intervalMinutes: number = 30
): Promise<AvailableSlot[]> {
  const supabase = createSupabaseAdmin();
  const dayKey = getDayKey(date);

  // 1. Get staff working hours
  const { data: staffData } = await supabase
    .from('staff')
    .select('working_hours')
    .eq('id', staffId)
    .single();

  if (!staffData?.working_hours) return [];

  const dayHours = staffData.working_hours[dayKey] || [];
  if (dayHours.length === 0) return []; // Day off

  const timeRanges = parseTimeRanges(dayHours);

  // 2. Get existing bookings for this staff on this date
  const startOfDay = `${date}T00:00:00`;
  const endOfDay = `${date}T23:59:59`;

  const { data: existingBookings } = await supabase
    .from('bookings')
    .select('start_time, end_time')
    .eq('staff_id', staffId)
    .eq('store_id', storeId)
    .in('status', ['confirmed'])
    .gte('start_time', startOfDay)
    .lte('start_time', endOfDay);

  // 3. Generate all possible slots
  const allSlots = generateSlots(timeRanges, intervalMinutes);

  // 4. Check each slot for conflicts
  return allSlots.map(time => {
    const [h, m] = time.split(':').map(Number);
    const slotStart = new Date(`${date}T${time}:00`);
    const slotEnd = new Date(slotStart.getTime() + durationMinutes * 60 * 1000);

    const available = !isSlotConflicting(slotStart, slotEnd, existingBookings || []);

    return {
      time,
      start_time: slotStart.toISOString(),
      end_time: slotEnd.toISOString(),
      available,
    };
  });
}

/**
 * Check if a specific time slot is available (no conflicts)
 */
export async function isSlotAvailable(
  staffId: string,
  storeId: number,
  startTime: string,
  endTime: string,
  excludeBookingId?: string
): Promise<boolean> {
  const supabase = createSupabaseAdmin();

  let query = supabase
    .from('bookings')
    .select('id')
    .eq('staff_id', staffId)
    .eq('store_id', storeId)
    .in('status', ['confirmed'])
    .lt('start_time', endTime)
    .gt('end_time', startTime);

  if (excludeBookingId) {
    query = query.neq('id', excludeBookingId);
  }

  const { data } = await query;
  return !data || data.length === 0;
}

/**
 * Get all staff available for a service on a given date
 */
export async function getAvailableStaff(
  storeId: number,
  serviceId: string,
  date: string
): Promise<Array<{ id: string; name: string; avatar_url: string | null; slots: AvailableSlot[] }>> {
  const supabase = createSupabaseAdmin();

  // Get service duration
  const { data: service } = await supabase
    .from('services')
    .select('duration_minutes')
    .eq('id', serviceId)
    .single();

  if (!service) return [];

  // Get all active staff for this store who can do this service
  const { data: staffList } = await supabase
    .from('staff')
    .select('id, name, avatar_url, service_ids')
    .eq('store_id', storeId)
    .eq('is_active', true);

  if (!staffList) return [];

  // Filter staff who can do this service
  const qualified = staffList.filter(
    s => !s.service_ids || s.service_ids.length === 0 || s.service_ids.includes(serviceId)
  );

  // Get available slots for each qualified staff
  const results = await Promise.all(
    qualified.map(async (s) => {
      const slots = await getAvailableSlots(s.id, storeId, date, service.duration_minutes);
      return {
        id: s.id,
        name: s.name,
        avatar_url: s.avatar_url,
        slots: slots.filter(sl => sl.available),
      };
    })
  );

  return results.filter(r => r.slots.length > 0);
}
