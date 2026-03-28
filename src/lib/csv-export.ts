/**
 * CSV export utilities.
 * Used by the export API route (server-side) and ExportButton (client-side download trigger).
 */

/**
 * Build a CSV string from headers and rows.
 * Handles quoting for values that contain commas, quotes, or newlines.
 */
export function buildCSV(
  headers: string[],
  rows: (string | number | null | undefined)[][]
): string {
  const escape = (val: string | number | null | undefined): string => {
    if (val == null) return '';
    const str = String(val);
    // Quote if the value contains commas, double-quotes, or newlines
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const headerLine = headers.map(escape).join(',');
  const dataLines = rows.map((row) => row.map(escape).join(','));

  return [headerLine, ...dataLines].join('\r\n');
}

/**
 * Trigger a CSV file download in the browser.
 * Call this from a client component after fetching CSV content.
 */
export function downloadCSV(filename: string, csvContent: string): void {
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
