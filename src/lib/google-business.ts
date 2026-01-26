import { google } from 'googleapis';

const SCOPES = ['https://www.googleapis.com/auth/business.manage'];

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
        'https://developers.google.com/oauthplayground' // Redirect URL, usually playground for server-side scripts or your actual callback
    );

    oauth2Client.setCredentials({
        refresh_token: refreshToken
    });

    return google.mybusinessbusinessinformation({
        version: 'v1',
        auth: oauth2Client
    });
}

// Helper to use the Account Management API if needed (different from Business Information)
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

    oauth2Client.setCredentials({
        refresh_token: refreshToken
    });

    return google.mybusinessaccountmanagement({
        version: 'v1',
        auth: oauth2Client
    });
}
