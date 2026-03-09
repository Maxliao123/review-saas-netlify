import { describe, it, expect } from 'vitest';
import { parseCSV, parseCSVLine, EMAIL_RE, PHONE_RE } from '@/lib/csv-parser';

describe('parseCSVLine', () => {
  it('splits simple comma-separated values', () => {
    expect(parseCSVLine('John,john@example.com,+1234567890')).toEqual([
      'John', 'john@example.com', '+1234567890'
    ]);
  });

  it('handles quoted values with commas', () => {
    expect(parseCSVLine('"Doe, John",john@example.com')).toEqual([
      'Doe, John', 'john@example.com'
    ]);
  });

  it('handles escaped quotes inside quoted fields', () => {
    expect(parseCSVLine('"He said ""hi""",value')).toEqual([
      'He said "hi"', 'value'
    ]);
  });

  it('handles empty fields', () => {
    expect(parseCSVLine('John,,+1234567890')).toEqual([
      'John', '', '+1234567890'
    ]);
  });
});

describe('EMAIL_RE', () => {
  it('matches valid emails', () => {
    expect(EMAIL_RE.test('john@example.com')).toBe(true);
    expect(EMAIL_RE.test('user+tag@domain.co')).toBe(true);
    expect(EMAIL_RE.test('a@b.c')).toBe(true);
  });

  it('rejects invalid emails', () => {
    expect(EMAIL_RE.test('not-an-email')).toBe(false);
    expect(EMAIL_RE.test('@domain.com')).toBe(false);
    expect(EMAIL_RE.test('user@')).toBe(false);
    expect(EMAIL_RE.test('')).toBe(false);
  });
});

describe('PHONE_RE', () => {
  it('matches valid phone numbers', () => {
    expect(PHONE_RE.test('+1234567890')).toBe(true);
    expect(PHONE_RE.test('+886 912 345 678')).toBe(true);
    expect(PHONE_RE.test('(02) 2345-6789')).toBe(true);
    expect(PHONE_RE.test('0912345678')).toBe(true);
  });

  it('rejects invalid phone numbers', () => {
    expect(PHONE_RE.test('abc')).toBe(false);
    expect(PHONE_RE.test('12')).toBe(false);
  });
});

describe('parseCSV', () => {
  it('returns empty rows for empty input', () => {
    const result = parseCSV('');
    expect(result.rows).toHaveLength(0);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain('empty');
  });

  it('parses CSV with header row (name, email)', () => {
    const csv = 'name,email\nJohn Doe,john@example.com\nJane Smith,jane@test.com';
    const result = parseCSV(csv);
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]).toMatchObject({
      name: 'John Doe',
      email: 'john@example.com',
      channel: 'email',
      valid: true,
    });
    expect(result.rows[1]).toMatchObject({
      name: 'Jane Smith',
      email: 'jane@test.com',
      channel: 'email',
      valid: true,
    });
  });

  it('parses CSV with header row (name, phone)', () => {
    const csv = 'name,phone\nJohn,+1234567890\nJane,+0987654321';
    const result = parseCSV(csv);
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]).toMatchObject({
      name: 'John',
      phone: '+1234567890',
      channel: 'sms',
      valid: true,
    });
  });

  it('parses CSV with name, email, and phone columns', () => {
    const csv = 'name,email,phone\nJohn,john@test.com,+1234567890';
    const result = parseCSV(csv);
    expect(result.rows).toHaveLength(1);
    // Both exist, prefers email
    expect(result.rows[0]).toMatchObject({
      name: 'John',
      email: 'john@test.com',
      phone: '+1234567890',
      channel: 'email',
      valid: true,
    });
  });

  it('auto-detects format without header row', () => {
    const csv = 'John Doe,john@example.com';
    const result = parseCSV(csv);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toMatchObject({
      name: 'John Doe',
      email: 'john@example.com',
      channel: 'email',
      valid: true,
    });
  });

  it('auto-detects phone without header', () => {
    const csv = 'Jane,+886912345678';
    const result = parseCSV(csv);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toMatchObject({
      name: 'Jane',
      phone: '+886912345678',
      channel: 'sms',
      valid: true,
    });
  });

  it('marks rows without valid email/phone as invalid', () => {
    const csv = 'name,email\nJohn,not-an-email';
    const result = parseCSV(csv);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].valid).toBe(false);
    expect(result.errors).toHaveLength(1);
  });

  it('handles Windows-style line breaks (CRLF)', () => {
    const csv = 'name,email\r\nJohn,john@test.com\r\nJane,jane@test.com';
    const result = parseCSV(csv);
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0].valid).toBe(true);
    expect(result.rows[1].valid).toBe(true);
  });

  it('handles alternative header names', () => {
    const csv = 'customer_name,email_address,mobile\nBob,bob@x.com,+1111111111';
    const result = parseCSV(csv);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].name).toBe('Bob');
    expect(result.rows[0].email).toBe('bob@x.com');
  });

  it('skips blank lines in CSV', () => {
    const csv = 'name,email\n\nJohn,john@test.com\n\nJane,jane@test.com\n';
    const result = parseCSV(csv);
    expect(result.rows).toHaveLength(2);
  });

  it('handles many rows efficiently', () => {
    const header = 'name,email';
    const dataRows = Array.from({ length: 500 }, (_, i) => `User ${i},user${i}@test.com`);
    const csv = [header, ...dataRows].join('\n');
    const result = parseCSV(csv);
    expect(result.rows).toHaveLength(500);
    expect(result.rows.every(r => r.valid)).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});
