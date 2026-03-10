import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { generateWeeklyReport } from '@/lib/reports/weekly-aggregator';
import { renderReportPlainText, renderReportEmailHtml } from '@/lib/reports/renderers';
import { sendEmail } from '@/lib/notifications/channels/email';
import { sendLine } from '@/lib/notifications/channels/line';
import { sendSlack } from '@/lib/notifications/channels/slack';
import { sendWhatsApp } from '@/lib/notifications/channels/whatsapp';
import { hasFeature } from '@/lib/plan-limits';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Allow up to 60s for processing all stores

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get('cron_secret');

    if (secret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const outputLog: string[] = [];

    // Calculate last Monday
    const now = new Date();
    const dayOfWeek = now.getDay();
    const lastMonday = new Date(now);
    lastMonday.setDate(now.getDate() - dayOfWeek - 6); // Previous Monday
    lastMonday.setHours(0, 0, 0, 0);

    // Fetch all stores with weekly reports enabled + tenant plan
    const { data: stores } = await supabaseAdmin
      .from('stores')
      .select('id, name, tenant_id, weekly_report_enabled, tenants!inner(plan)')
      .eq('weekly_report_enabled', true);

    if (!stores || stores.length === 0) {
      return NextResponse.json({ success: true, message: 'No stores with weekly reports enabled' });
    }

    for (const store of stores) {
      // Plan gating: skip if plan doesn't include weekly reports
      const tenantPlan = (store as any).tenants?.plan || 'free';
      if (!hasFeature(tenantPlan, 'weeklyReports')) {
        outputLog.push(`${store.name}: skipped (plan "${tenantPlan}" does not include weekly reports)`);
        continue;
      }
      try {
        // Generate report
        const reportData = await generateWeeklyReport(store.id, lastMonday);

        // Store in DB
        await supabaseAdmin.from('weekly_reports').upsert({
          store_id: store.id,
          tenant_id: store.tenant_id,
          report_week: lastMonday.toISOString().split('T')[0],
          data: reportData,
          delivered_via: [],
        }, { onConflict: 'store_id,report_week' });

        // Fetch notification channels for weekly reports
        const { data: channels } = await supabaseAdmin
          .from('notification_channels')
          .select('*')
          .eq('store_id', store.id)
          .eq('is_active', true);

        const deliveredVia: string[] = [];

        if (channels && channels.length > 0) {
          for (const channel of channels) {
            try {
              switch (channel.channel_type) {
                case 'email': {
                  const config = channel.config as { recipients?: string[] };
                  if (config.recipients?.length) {
                    const { subject, html } = renderReportEmailHtml(reportData, store.name);
                    await sendEmail({ recipients: config.recipients, subject, html });
                    deliveredVia.push('email');
                  }
                  break;
                }
                case 'line': {
                  const config = channel.config as any;
                  if (config.channel_access_token && config.target_user_id) {
                    const text = renderReportPlainText(reportData, store.name, 'zh');
                    await sendLine(config, { text });
                    deliveredVia.push('line');
                  }
                  break;
                }
                case 'slack': {
                  const config = channel.config as { webhook_url?: string };
                  if (config.webhook_url) {
                    const text = renderReportPlainText(reportData, store.name);
                    await sendSlack(config as any, { text });
                    deliveredVia.push('slack');
                  }
                  break;
                }
                case 'whatsapp': {
                  const config = channel.config as any;
                  if (config.phone_number && config.account_sid) {
                    const body = renderReportPlainText(reportData, store.name);
                    await sendWhatsApp(config, { body });
                    deliveredVia.push('whatsapp');
                  }
                  break;
                }
              }
            } catch (channelErr: any) {
              console.error(`Weekly report delivery failed for ${store.name} via ${channel.channel_type}:`, channelErr);
            }
          }

          // Update delivered_via
          if (deliveredVia.length > 0) {
            await supabaseAdmin
              .from('weekly_reports')
              .update({ delivered_via: deliveredVia })
              .eq('store_id', store.id)
              .eq('report_week', lastMonday.toISOString().split('T')[0]);
          }
        }

        outputLog.push(`${store.name}: report generated, delivered via [${deliveredVia.join(', ') || 'none'}]`);
      } catch (storeErr: any) {
        outputLog.push(`${store.name}: FAILED - ${storeErr.message}`);
      }
    }

    return NextResponse.json({ success: true, processed: outputLog });
  } catch (error: any) {
    console.error('Weekly report cron error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
