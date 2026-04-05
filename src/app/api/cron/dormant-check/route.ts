import { NextResponse } from 'next/server';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { sendSMS } from '@/lib/sms';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get('cron_secret');

    if (secret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createSupabaseAdmin();
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://app.replywiseai.com';
    const errors: string[] = [];
    let checked = 0;
    let notified_30d = 0;
    let notified_60d = 0;

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString();

    // ---- 60-day dormant members (check first so 30-day doesn't overlap) ----
    const { data: dormant60, error: err60 } = await supabase
      .from('members')
      .select('id, name, phone, member_token, store_id, tags, stores!inner ( name )')
      .eq('status', 'active')
      .lt('last_visit_at', sixtyDaysAgo)
      .not('tags', 'cs', '{"dormant_60d"}');

    if (err60) {
      errors.push(`60d query error: ${err60.message}`);
    }

    if (dormant60 && dormant60.length > 0) {
      checked += dormant60.length;

      for (const member of dormant60) {
        const store = (member as any).stores as any;
        const link = `${baseUrl}/m/${member.member_token}`;

        // Check for active credit packages
        const { data: credits } = await supabase
          .from('member_credits')
          .select('package_name, remaining_units')
          .eq('member_id', member.id)
          .eq('status', 'active')
          .gt('remaining_units', 0);

        let body: string;
        if (credits && credits.length > 0) {
          const total = credits.reduce((sum, c) => sum + c.remaining_units, 0);
          body = `Hi ${member.name}, we miss you at ${store.name}! You still have ${total} sessions available. Book now + earn 2x bonus points this week: ${link}`;
        } else {
          body = `Hi ${member.name}, it's been a while! ${store.name} has a special offer waiting for you. Check it out + earn 2x bonus points: ${link}`;
        }
        body += '\nReply STOP to unsubscribe.';

        const result = await sendSMS({ to: member.phone, body });

        if (result.success) {
          // Add dormant_60d tag (also ensure dormant_30d is present)
          const existingTags: string[] = member.tags || [];
          const newTags = Array.from(new Set([...existingTags, 'dormant_30d', 'dormant_60d']));
          await supabase
            .from('members')
            .update({ tags: newTags })
            .eq('id', member.id);
          notified_60d++;
        } else {
          errors.push(`Member ${member.id} (60d): ${result.error}`);
        }
      }
    }

    // ---- 30-day dormant members ----
    const { data: dormant30, error: err30 } = await supabase
      .from('members')
      .select('id, name, phone, member_token, store_id, tags, stores!inner ( name )')
      .eq('status', 'active')
      .lt('last_visit_at', thirtyDaysAgo)
      .gte('last_visit_at', sixtyDaysAgo)
      .not('tags', 'cs', '{"dormant_30d"}');

    if (err30) {
      errors.push(`30d query error: ${err30.message}`);
    }

    if (dormant30 && dormant30.length > 0) {
      checked += dormant30.length;

      for (const member of dormant30) {
        const store = (member as any).stores as any;
        const link = `${baseUrl}/m/${member.member_token}`;

        // Check for active credit packages
        const { data: credits } = await supabase
          .from('member_credits')
          .select('package_name, remaining_units')
          .eq('member_id', member.id)
          .eq('status', 'active')
          .gt('remaining_units', 0);

        let body: string;
        if (credits && credits.length > 0) {
          const total = credits.reduce((sum, c) => sum + c.remaining_units, 0);
          const pkgName = credits[0].package_name;
          body = `Hi ${member.name}, you have ${total} sessions left in your ${pkgName}. Book now: ${link}`;
        } else {
          body = `Hi ${member.name}, we haven't seen you in a while at ${store.name}! Book your next visit: ${link}`;
        }
        body += '\nReply STOP to unsubscribe.';

        const result = await sendSMS({ to: member.phone, body });

        if (result.success) {
          const existingTags: string[] = member.tags || [];
          const newTags = Array.from(new Set([...existingTags, 'dormant_30d']));
          await supabase
            .from('members')
            .update({ tags: newTags })
            .eq('id', member.id);
          notified_30d++;
        } else {
          errors.push(`Member ${member.id} (30d): ${result.error}`);
        }
      }
    }

    return NextResponse.json({ checked, notified_30d, notified_60d, errors });
  } catch (error: any) {
    console.error('Error in dormant-check cron:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
