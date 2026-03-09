/**
 * CSV Parser for bulk invite imports.
 * Handles name, email, phone columns with auto-detection.
 */

export interface CsvRow {
  name: string;
  email: string;
  phone: string;
  channel: 'email' | 'sms';
  valid: boolean;
  error?: string;
}

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const PHONE_RE = /^\+?[0-9\s\-()]{7,20}$/;

/**
 * Parse a raw CSV line into fields, handling quoted values.
 */
export function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

/**
 * Parse a full CSV string into typed CsvRows.
 * Auto-detects header row and column mapping.
 */
export function parseCSV(text: string): { rows: CsvRow[]; errors: string[] } {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) return { rows: [], errors: ['CSV file is empty.'] };

  // Detect header row
  const firstLine = lines[0].toLowerCase();
  const hasHeader = firstLine.includes('name') || firstLine.includes('email') || firstLine.includes('phone');
  const dataLines = hasHeader ? lines.slice(1) : lines;

  // Detect columns from header
  let nameCol = -1, emailCol = -1, phoneCol = -1;
  if (hasHeader) {
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''));
    nameCol = headers.findIndex(h => h === 'name' || h === 'customer_name' || h === 'customer');
    emailCol = headers.findIndex(h => h === 'email' || h === 'email_address' || h === 'e-mail');
    phoneCol = headers.findIndex(h => h === 'phone' || h === 'phone_number' || h === 'mobile' || h === 'sms');
  } else {
    // Auto-detect: assume col 0 = name, col 1 = email or phone
    nameCol = 0;
    emailCol = 1;
    phoneCol = 1;
  }

  const rows: CsvRow[] = [];
  const errors: string[] = [];

  for (let i = 0; i < dataLines.length; i++) {
    const fields = parseCSVLine(dataLines[i]);

    const name = (nameCol >= 0 && fields[nameCol]) ? fields[nameCol].trim() : '';
    const emailValue = (emailCol >= 0 && fields[emailCol]) ? fields[emailCol].trim() : '';
    const phoneValue = (phoneCol >= 0 && fields[phoneCol]) ? fields[phoneCol].trim() : '';

    const isEmail = EMAIL_RE.test(emailValue);
    const isPhone = PHONE_RE.test(phoneValue);

    if (!isEmail && !isPhone) {
      // Try the second field as combined
      const combinedField = fields[1]?.trim() || '';
      if (EMAIL_RE.test(combinedField)) {
        rows.push({ name, email: combinedField, phone: '', channel: 'email', valid: true });
      } else if (PHONE_RE.test(combinedField)) {
        rows.push({ name, email: '', phone: combinedField, channel: 'sms', valid: true });
      } else {
        rows.push({ name, email: emailValue, phone: phoneValue, channel: 'email', valid: false, error: 'No valid email or phone found' });
        errors.push(`Row ${i + 1}: No valid email or phone found.`);
      }
    } else if (isEmail && isPhone && emailCol !== phoneCol) {
      rows.push({ name, email: emailValue, phone: phoneValue, channel: 'email', valid: true });
    } else if (isEmail) {
      rows.push({ name, email: emailValue, phone: '', channel: 'email', valid: true });
    } else {
      rows.push({ name, email: '', phone: phoneValue, channel: 'sms', valid: true });
    }
  }

  return { rows, errors };
}
