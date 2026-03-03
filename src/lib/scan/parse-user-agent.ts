// Ported from Project-QRcode-Tool: lib/utils/analytics.ts

interface ParsedUA {
  device_type: 'mobile' | 'tablet' | 'desktop' | 'unknown';
  os_type: string;
  browser: string;
}

export function parseUserAgent(ua: string): ParsedUA {
  if (!ua) return { device_type: 'unknown', os_type: 'Unknown', browser: 'Unknown' };

  const lowerUA = ua.toLowerCase();

  // Device type
  let device_type: ParsedUA['device_type'] = 'desktop';
  if (/tablet|ipad|playbook|silk/i.test(ua)) {
    device_type = 'tablet';
  } else if (/mobile|android|iphone|ipod|blackberry|iemobile|opera mini/i.test(ua)) {
    device_type = 'mobile';
  }

  // OS detection
  let os_type = 'Unknown';
  if (/windows/i.test(ua)) os_type = 'Windows';
  else if (/macintosh|mac os/i.test(ua)) os_type = 'macOS';
  else if (/iphone|ipad|ipod/i.test(ua)) os_type = 'iOS';
  else if (/android/i.test(ua)) os_type = 'Android';
  else if (/linux/i.test(ua)) os_type = 'Linux';
  else if (/cros/i.test(ua)) os_type = 'Chrome OS';

  // Browser detection
  let browser = 'Unknown';
  if (/edg\//i.test(ua)) browser = 'Edge';
  else if (/opr\/|opera/i.test(ua)) browser = 'Opera';
  else if (/chrome|crios/i.test(ua)) browser = 'Chrome';
  else if (/firefox|fxios/i.test(ua)) browser = 'Firefox';
  else if (/safari/i.test(ua) && !/chrome/i.test(ua)) browser = 'Safari';
  else if (/msie|trident/i.test(ua)) browser = 'IE';

  return { device_type, os_type, browser };
}
