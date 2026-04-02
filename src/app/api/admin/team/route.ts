import { NextResponse } from 'next/server';
import { createSupabaseServerClient, getUserTenantContext } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { sendEmail } from '@/lib/notifications/channels/email';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/team — List all team members for the current tenant
 */
export async function GET() {
  try {
    const ctx = await getUserTenantContext();
    if (!ctx?.tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createSupabaseServerClient();
    const { data: members, error } = await supabase
      .from('tenant_members')
      .select(`
        id,
        user_id,
        role,
        store_ids,
        invited_at,
        accepted_at,
        profiles (id, display_name, email, avatar_url)
      `)
      .eq('tenant_id', ctx.tenant.id)
      .order('invited_at', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      members: members || [],
      currentUserId: ctx.user.id,
      currentRole: ctx.role,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * POST /api/admin/team — Invite a new team member by email
 * Body: { email, role }
 */
export async function POST(request: Request) {
  try {
    const ctx = await getUserTenantContext();
    if (!ctx?.tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only owner/manager can invite
    if (ctx.role === 'staff') {
      return NextResponse.json(
        { error: 'Only owners and managers can invite team members' },
        { status: 403 }
      );
    }

    let body: { email?: string; role?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    const { email, role } = body;

    if (!email || !email.trim()) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    if (!role || !['manager', 'staff'].includes(role)) {
      return NextResponse.json({ error: 'Role must be manager or staff' }, { status: 400 });
    }

    // Manager can only assign staff
    if (ctx.role === 'manager' && role !== 'staff') {
      return NextResponse.json(
        { error: 'Managers can only invite staff members' },
        { status: 403 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check if user already exists in profiles
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('id, email')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (existingProfile) {
      // Check if already a member of this tenant
      const { data: existingMember } = await supabaseAdmin
        .from('tenant_members')
        .select('id')
        .eq('tenant_id', ctx.tenant.id)
        .eq('user_id', existingProfile.id)
        .maybeSingle();

      if (existingMember) {
        return NextResponse.json(
          { error: 'This user is already a team member' },
          { status: 409 }
        );
      }

      // Add existing user as a member
      const { error: insertError } = await supabaseAdmin
        .from('tenant_members')
        .insert({
          tenant_id: ctx.tenant.id,
          user_id: existingProfile.id,
          role,
          invited_at: new Date().toISOString(),
          accepted_at: new Date().toISOString(),
        });

      if (insertError) {
        return NextResponse.json({ error: insertError.message }, { status: 500 });
      }
    } else {
      // Invite user via Supabase Auth (sends magic link)
      const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
        normalizedEmail,
        { data: { invited_tenant_id: ctx.tenant.id, invited_role: role } }
      );

      if (inviteError) {
        return NextResponse.json({ error: inviteError.message }, { status: 500 });
      }

      if (inviteData.user) {
        // Pre-create profile and membership for invited user
        await supabaseAdmin.from('profiles').upsert({
          id: inviteData.user.id,
          email: normalizedEmail,
          display_name: normalizedEmail.split('@')[0],
        });

        await supabaseAdmin.from('tenant_members').insert({
          tenant_id: ctx.tenant.id,
          user_id: inviteData.user.id,
          role,
          invited_at: new Date().toISOString(),
        });
      }
    }

    // Send notification email
    await sendEmail({
      recipients: [normalizedEmail],
      subject: `You've been invited to ${ctx.tenant.name} on ReplyWise AI`,
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
          <h2 style="color: #1e40af;">You're invited!</h2>
          <p>You've been invited to join <strong>${ctx.tenant.name}</strong> as a <strong>${role}</strong> on ReplyWise AI.</p>
          <p>Sign in to your account to get started managing reviews with your team.</p>
          <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://www.replywiseai.com'}/auth/login"
             style="display: inline-block; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 8px; margin-top: 12px;">
            Sign In
          </a>
          <p style="color: #6b7280; font-size: 14px; margin-top: 24px;">
            — The ReplyWise AI Team
          </p>
        </div>
      `,
    });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * PUT /api/admin/team — Update a team member's role
 * Body: { memberId, role }
 */
export async function PUT(request: Request) {
  try {
    const ctx = await getUserTenantContext();
    if (!ctx?.tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (ctx.role !== 'owner') {
      return NextResponse.json(
        { error: 'Only owners can change member roles' },
        { status: 403 }
      );
    }

    let body: { memberId?: string; role?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    const { memberId, role } = body;

    if (!memberId || !role || !['owner', 'manager', 'staff'].includes(role)) {
      return NextResponse.json({ error: 'Valid memberId and role required' }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase
      .from('tenant_members')
      .update({ role })
      .eq('id', memberId)
      .eq('tenant_id', ctx.tenant.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/team — Remove a team member
 * Body: { memberId }
 */
export async function DELETE(request: Request) {
  try {
    const ctx = await getUserTenantContext();
    if (!ctx?.tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (ctx.role !== 'owner') {
      return NextResponse.json(
        { error: 'Only owners can remove team members' },
        { status: 403 }
      );
    }

    let body: { memberId?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    const { memberId } = body;

    if (!memberId) {
      return NextResponse.json({ error: 'memberId is required' }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();

    // Fetch the member to validate
    const { data: member } = await supabase
      .from('tenant_members')
      .select('id, user_id, role')
      .eq('id', memberId)
      .eq('tenant_id', ctx.tenant.id)
      .maybeSingle();

    if (!member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    // Cannot remove yourself
    if (member.user_id === ctx.user.id) {
      return NextResponse.json(
        { error: 'You cannot remove yourself from the team' },
        { status: 400 }
      );
    }

    // Cannot remove the last owner
    if (member.role === 'owner') {
      const { data: owners } = await supabase
        .from('tenant_members')
        .select('id')
        .eq('tenant_id', ctx.tenant.id)
        .eq('role', 'owner');

      if (!owners || owners.length <= 1) {
        return NextResponse.json(
          { error: 'Cannot remove the last owner' },
          { status: 400 }
        );
      }
    }

    const { error } = await supabase
      .from('tenant_members')
      .delete()
      .eq('id', memberId)
      .eq('tenant_id', ctx.tenant.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
