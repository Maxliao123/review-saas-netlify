import { getGoogleClientForTenant } from '@/lib/google-business';

export interface GoogleLocation {
  name: string;       // e.g. "locations/12345"
  title: string;      // Business display name
  placeId: string;    // Google Maps Place ID
  address: string;    // Formatted address
}

export async function listGoogleLocations(tenantId: string): Promise<GoogleLocation[]> {
  const client = await getGoogleClientForTenant(tenantId);
  if (!client) {
    throw new Error('Google Business not connected for this tenant');
  }

  const { accounts, gmb } = client;

  // 1. List accounts
  const accountsRes = await accounts.accounts.list();
  const accountsList = accountsRes.data.accounts || [];
  if (accountsList.length === 0) {
    throw new Error('No Google Business accounts found');
  }
  const accountName = accountsList[0].name!;

  // 2. List locations
  const locationsResponse = await gmb.accounts.locations.list({
    parent: accountName,
    readMask: 'name,title,storeCode,regularHours,metadata,storefrontAddress',
  });
  const locations = locationsResponse.data.locations || [];

  // 3. Map to clean interface
  return locations.map((loc: any) => ({
    name: loc.name || '',
    title: loc.title || '',
    placeId: loc.metadata?.placeId || '',
    address: formatAddress(loc.storefrontAddress),
  }));
}

function formatAddress(addr: any): string {
  if (!addr) return '';
  const lines = addr.addressLines || [];
  const parts = [
    ...lines,
    addr.locality,
    addr.administrativeArea,
    addr.postalCode,
  ].filter(Boolean);
  return parts.join(', ');
}
