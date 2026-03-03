// IP geolocation using ipapi.co (free tier: 1000 req/day)

interface GeoResult {
  city: string | null;
  country: string | null;
}

export async function geoLookup(ip: string): Promise<GeoResult> {
  if (!ip || ip === 'unknown' || ip === '127.0.0.1' || ip === '::1') {
    return { city: null, country: null };
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);

    const res = await fetch(`https://ipapi.co/${ip}/json/`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) {
      return { city: null, country: null };
    }

    const data = await res.json();

    if (data.error) {
      return { city: null, country: null };
    }

    return {
      city: data.city || null,
      country: data.country_code || null,
    };
  } catch {
    // Graceful degradation: if lookup fails, return nulls
    return { city: null, country: null };
  }
}
