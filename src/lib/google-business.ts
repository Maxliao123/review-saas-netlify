import { google } from 'googleapis';
import { supabaseAdmin } from '@/lib/supabase/admin';

const SCOPES = ['https://www.googleapis.com/auth/business.manage'];

// ============================================================
// Per-tenant Google OAuth (reads tokens from DB)
// ============================================================

export async function getGoogleClientForTenant(tenantId: string) {
  const { data: creds, error } = await supabaseAdmin
    .from('google_credentials')
    .select('*')
    .eq('tenant_id', tenantId)
    .single();

  if (error || !creds) {
    return null; // Tenant has not connected Google yet
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.NEXT_PUBLIC_APP_DOMAIN || 'http://localhost:3000'}/api/auth/google-business/callback`
  );

  oauth2Client.setCredentials({
    access_token: creds.access_token,
    refresh_token: creds.refresh_token,
    expiry_date: creds.token_expires_at ? new Date(creds.token_expires_at).getTime() : undefined,
  });

  // Auto-refresh handler
  oauth2Client.on('tokens', async (tokens) => {
    const updates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };
    if (tokens.access_token) updates.access_token = tokens.access_token;
    if (tokens.refresh_token) updates.refresh_token = tokens.refresh_token;
    if (tokens.expiry_date) updates.token_expires_at = new Date(tokens.expiry_date).toISOString();

    await supabaseAdmin
      .from('google_credentials')
      .update(updates)
      .eq('tenant_id', tenantId);
  });

  return {
    oauth2Client,
    gmb: google.mybusinessbusinessinformation({ version: 'v1', auth: oauth2Client }),
    accounts: google.mybusinessaccountmanagement({ version: 'v1', auth: oauth2Client }),
    googleEmail: creds.google_email,
  };
}

// Generate the OAuth consent URL for a tenant to connect their Google Business
export function getGoogleOAuthUrl(tenantId: string, redirectTo?: string) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.NEXT_PUBLIC_APP_DOMAIN || 'http://localhost:3000'}/api/auth/google-business/callback`
  );

  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: SCOPES,
    state: JSON.stringify({ tenant_id: tenantId, redirect_to: redirectTo }),
  });
}

// Exchange authorization code for tokens and store in DB
export async function exchangeGoogleCode(code: string, tenantId: string) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.NEXT_PUBLIC_APP_DOMAIN || 'http://localhost:3000'}/api/auth/google-business/callback`
  );

  const { tokens } = await oauth2Client.getToken(code);
  oauth2Client.setCredentials(tokens);

  // Get the Google email of the authenticated user
  const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
  const { data: userInfo } = await oauth2.userinfo.get();

  // Upsert credentials
  const { error } = await supabaseAdmin
    .from('google_credentials')
    .upsert({
      tenant_id: tenantId,
      google_email: userInfo.email || null,
      access_token: tokens.access_token!,
      refresh_token: tokens.refresh_token!,
      token_expires_at: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null,
      scopes: SCOPES,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'tenant_id',
    });

  if (error) throw error;

  return { email: userInfo.email };
}

// Get all tenants that have connected Google credentials
export async function getConnectedTenants() {
  const { data, error } = await supabaseAdmin
    .from('google_credentials')
    .select('tenant_id');

  if (error) return [];
  return data.map(d => d.tenant_id);
}

// ============================================================
// Legacy: Environment variable-based clients (fallback / backward compat)
// ============================================================

export function getGoogleBusinessClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error('Missing Google API specific environment variables (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN)');
  }

  const oauth2Client = new google.auth.OAuth2(
    clientId,
    clientSecret,
    'https://developers.google.com/oauthplayground'
  );

  oauth2Client.setCredentials({ refresh_token: refreshToken });

  return google.mybusinessbusinessinformation({
    version: 'v1',
    auth: oauth2Client,
  });
}

export function getGoogleAccountManagementClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error('Missing Google API specific environment variables');
  }

  const oauth2Client = new google.auth.OAuth2(
    clientId,
    clientSecret,
    process.env.GOOGLE_REDIRECT_URI || 'https://developers.google.com/oauthplayground'
  );

  oauth2Client.setCredentials({ refresh_token: refreshToken });

  return google.mybusinessaccountmanagement({
    version: 'v1',
    auth: oauth2Client,
  });
}

export function getGoogleOAuth2Client() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error('Missing Google API specific environment variables');
  }

  const oauth2Client = new google.auth.OAuth2(
    clientId,
    clientSecret,
    process.env.GOOGLE_REDIRECT_URI || 'https://developers.google.com/oauthplayground'
  );

  oauth2Client.setCredentials({ refresh_token: refreshToken });

  return oauth2Client;
}
