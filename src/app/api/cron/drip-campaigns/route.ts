import { NextResponse } from 'next/server';
import { processPendingDrips } from '@/lib/drip-campaigns';

export const dynamic = 'force-dynamic';

/**
 * Cron: Process pending drip campaign emails (thank-you + 24h reminders).
 * Runs hourly via GitHub Actions.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get('cron_secret');

    if (secret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await processPendingDrips();

    return NextResponse.json({
      success: true,
      sent: result.sent,
      skipped: result.skipped,
      failed: result.failed,
      log: result.log,
    });
  } catch (error: any) {
    console.error('Error in drip-campaigns cron:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
