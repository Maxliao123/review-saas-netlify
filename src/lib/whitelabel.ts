/**
 * White-Label Configuration Engine
 *
 * Allows enterprise tenants to fully rebrand the platform
 * with custom logos, colors, domains, and email sending.
 */

export interface WhiteLabelConfig {
  brandName: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  customDomain: string | null;
  customDomainVerified: boolean;
  hidePoweredBy: boolean;
  customEmailFrom: string | null;
  customEmailName: string | null;
  cssOverrides: string | null;
  isActive: boolean;
}

export const DEFAULT_CONFIG: WhiteLabelConfig = {
  brandName: 'Reputation Monitor',
  logoUrl: null,
  faviconUrl: null,
  primaryColor: '#2563eb',
  secondaryColor: '#1e40af',
  accentColor: '#3b82f6',
  customDomain: null,
  customDomainVerified: false,
  hidePoweredBy: false,
  customEmailFrom: null,
  customEmailName: null,
  cssOverrides: null,
  isActive: false,
};

/**
 * Generate CSS custom properties from white-label config.
 */
export function generateCssVariables(config: WhiteLabelConfig): string {
  if (!config.isActive) return '';

  let css = ':root {\n';
  css += `  --wl-primary: ${config.primaryColor};\n`;
  css += `  --wl-secondary: ${config.secondaryColor};\n`;
  css += `  --wl-accent: ${config.accentColor};\n`;

  // Generate lighter/darker variants
  css += `  --wl-primary-light: ${lightenColor(config.primaryColor, 0.9)};\n`;
  css += `  --wl-primary-dark: ${darkenColor(config.primaryColor, 0.8)};\n`;
  css += '}\n';

  if (config.cssOverrides) {
    css += `\n/* Custom overrides */\n${config.cssOverrides}\n`;
  }

  return css;
}

/**
 * Validate a hex color code.
 */
export function isValidHexColor(color: string): boolean {
  return /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(color);
}

/**
 * Validate a custom domain format.
 */
export function isValidDomain(domain: string): boolean {
  return /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/.test(domain);
}

/**
 * Generate DNS verification record for custom domain.
 */
export function generateDnsVerification(tenantId: number, domain: string): {
  type: string;
  name: string;
  value: string;
} {
  return {
    type: 'CNAME',
    name: domain,
    value: `tenant-${tenantId}.reputation-monitor.app`,
  };
}

/**
 * Get the email "From" for a white-labeled tenant.
 */
export function getEmailFrom(config: WhiteLabelConfig): { email: string; name: string } {
  if (config.isActive && config.customEmailFrom) {
    return {
      email: config.customEmailFrom,
      name: config.customEmailName || config.brandName,
    };
  }
  return {
    email: 'noreply@reputation-monitor.app',
    name: 'Reputation Monitor',
  };
}

/**
 * Lighten a hex color.
 */
function lightenColor(hex: string, factor: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const r = Math.round(rgb.r + (255 - rgb.r) * factor);
  const g = Math.round(rgb.g + (255 - rgb.g) * factor);
  const b = Math.round(rgb.b + (255 - rgb.b) * factor);
  return rgbToHex(r, g, b);
}

/**
 * Darken a hex color.
 */
function darkenColor(hex: string, factor: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  return rgbToHex(
    Math.round(rgb.r * factor),
    Math.round(rgb.g * factor),
    Math.round(rgb.b * factor)
  );
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const match = hex.replace('#', '').match(/.{2}/g);
  if (!match || match.length !== 3) return null;
  return {
    r: parseInt(match[0], 16),
    g: parseInt(match[1], 16),
    b: parseInt(match[2], 16),
  };
}

function rgbToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map(v => Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0')).join('')}`;
}
