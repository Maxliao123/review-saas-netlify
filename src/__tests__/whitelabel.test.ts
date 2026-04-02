import { describe, it, expect } from 'vitest';
import {
  DEFAULT_CONFIG,
  generateCssVariables,
  isValidHexColor,
  isValidDomain,
  generateDnsVerification,
  getEmailFrom,
  type WhiteLabelConfig,
} from '../lib/whitelabel';

// --------------- DEFAULT_CONFIG ---------------

describe('DEFAULT_CONFIG', () => {
  it('should have sensible defaults', () => {
    expect(DEFAULT_CONFIG.brandName).toBe('ReplyWise AI');
    expect(DEFAULT_CONFIG.isActive).toBe(false);
    expect(DEFAULT_CONFIG.hidePoweredBy).toBe(false);
    expect(DEFAULT_CONFIG.primaryColor).toMatch(/^#[0-9a-fA-F]{6}$/);
    expect(DEFAULT_CONFIG.secondaryColor).toMatch(/^#[0-9a-fA-F]{6}$/);
    expect(DEFAULT_CONFIG.accentColor).toMatch(/^#[0-9a-fA-F]{6}$/);
  });

  it('should have null optional fields', () => {
    expect(DEFAULT_CONFIG.logoUrl).toBeNull();
    expect(DEFAULT_CONFIG.faviconUrl).toBeNull();
    expect(DEFAULT_CONFIG.customDomain).toBeNull();
    expect(DEFAULT_CONFIG.customEmailFrom).toBeNull();
    expect(DEFAULT_CONFIG.cssOverrides).toBeNull();
  });
});

// --------------- generateCssVariables ---------------

describe('generateCssVariables', () => {
  it('should return empty string when not active', () => {
    const result = generateCssVariables({ ...DEFAULT_CONFIG, isActive: false });
    expect(result).toBe('');
  });

  it('should generate CSS variables when active', () => {
    const config: WhiteLabelConfig = {
      ...DEFAULT_CONFIG,
      isActive: true,
      primaryColor: '#ff0000',
      secondaryColor: '#00ff00',
      accentColor: '#0000ff',
    };
    const result = generateCssVariables(config);
    expect(result).toContain(':root');
    expect(result).toContain('--wl-primary: #ff0000');
    expect(result).toContain('--wl-secondary: #00ff00');
    expect(result).toContain('--wl-accent: #0000ff');
    expect(result).toContain('--wl-primary-light');
    expect(result).toContain('--wl-primary-dark');
  });

  it('should include CSS overrides when provided', () => {
    const config: WhiteLabelConfig = {
      ...DEFAULT_CONFIG,
      isActive: true,
      cssOverrides: '.custom-class { color: red; }',
    };
    const result = generateCssVariables(config);
    expect(result).toContain('Custom overrides');
    expect(result).toContain('.custom-class { color: red; }');
  });

  it('should not include CSS overrides when null', () => {
    const config: WhiteLabelConfig = {
      ...DEFAULT_CONFIG,
      isActive: true,
      cssOverrides: null,
    };
    const result = generateCssVariables(config);
    expect(result).not.toContain('Custom overrides');
  });
});

// --------------- isValidHexColor ---------------

describe('isValidHexColor', () => {
  it('should accept valid 6-digit hex colors', () => {
    expect(isValidHexColor('#ff0000')).toBe(true);
    expect(isValidHexColor('#00FF00')).toBe(true);
    expect(isValidHexColor('#2563eb')).toBe(true);
    expect(isValidHexColor('#FFFFFF')).toBe(true);
    expect(isValidHexColor('#000000')).toBe(true);
  });

  it('should accept valid 3-digit hex colors', () => {
    expect(isValidHexColor('#fff')).toBe(true);
    expect(isValidHexColor('#000')).toBe(true);
    expect(isValidHexColor('#F0F')).toBe(true);
  });

  it('should reject invalid formats', () => {
    expect(isValidHexColor('ff0000')).toBe(false);
    expect(isValidHexColor('#ff00')).toBe(false);
    expect(isValidHexColor('#gggggg')).toBe(false);
    expect(isValidHexColor('red')).toBe(false);
    expect(isValidHexColor('')).toBe(false);
    expect(isValidHexColor('#ff0000ff')).toBe(false);
  });
});

// --------------- isValidDomain ---------------

describe('isValidDomain', () => {
  it('should accept valid domains', () => {
    expect(isValidDomain('example.com')).toBe(true);
    expect(isValidDomain('reviews.mybrand.com')).toBe(true);
    expect(isValidDomain('sub.domain.co.uk')).toBe(true);
    expect(isValidDomain('my-brand.com')).toBe(true);
  });

  it('should reject invalid domains', () => {
    expect(isValidDomain('')).toBe(false);
    expect(isValidDomain('localhost')).toBe(false);
    expect(isValidDomain('http://example.com')).toBe(false);
    expect(isValidDomain('.example.com')).toBe(false);
    expect(isValidDomain('example.')).toBe(false);
    expect(isValidDomain('-example.com')).toBe(false);
  });
});

// --------------- generateDnsVerification ---------------

describe('generateDnsVerification', () => {
  it('should generate correct CNAME record', () => {
    const result = generateDnsVerification(42, 'reviews.mybrand.com');
    expect(result.type).toBe('CNAME');
    expect(result.name).toBe('reviews.mybrand.com');
    expect(result.value).toBe('tenant-42.replywiseai.com');
  });

  it('should include tenant ID in target', () => {
    const result = generateDnsVerification(100, 'app.example.com');
    expect(result.value).toContain('tenant-100');
  });
});

// --------------- getEmailFrom ---------------

describe('getEmailFrom', () => {
  it('should return default email when not active', () => {
    const result = getEmailFrom(DEFAULT_CONFIG);
    expect(result.email).toBe('noreply@replywiseai.com');
    expect(result.name).toBe('ReplyWise AI');
  });

  it('should return custom email when active with custom email', () => {
    const config: WhiteLabelConfig = {
      ...DEFAULT_CONFIG,
      isActive: true,
      customEmailFrom: 'hello@mybrand.com',
      customEmailName: 'My Brand',
    };
    const result = getEmailFrom(config);
    expect(result.email).toBe('hello@mybrand.com');
    expect(result.name).toBe('My Brand');
  });

  it('should fallback to brand name if no custom email name', () => {
    const config: WhiteLabelConfig = {
      ...DEFAULT_CONFIG,
      isActive: true,
      customEmailFrom: 'hello@mybrand.com',
      customEmailName: null,
      brandName: 'Cool Brand',
    };
    const result = getEmailFrom(config);
    expect(result.name).toBe('Cool Brand');
  });

  it('should return default when active but no custom email set', () => {
    const config: WhiteLabelConfig = {
      ...DEFAULT_CONFIG,
      isActive: true,
      customEmailFrom: null,
    };
    const result = getEmailFrom(config);
    expect(result.email).toBe('noreply@replywiseai.com');
    expect(result.name).toBe('ReplyWise AI');
  });
});
