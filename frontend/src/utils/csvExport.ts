export interface CsvColumn {
  key: string;
  header: string;
  /** Optional formatter — defaults to String(value) */
  format?: (value: unknown, row: Record<string, unknown>) => string;
}

/**
 * Column set for the User Management export. Extend/duplicate this
 * pattern (e.g. JOB_CSV_COLUMNS) as other modules add CSV export.
 */
export const USER_CSV_COLUMNS: CsvColumn[] = [
  { key: '_id', header: 'ID' },
  { key: 'name', header: 'Name' },
  { key: 'email', header: 'Email' },
  { key: 'role', header: 'Role' },
  { key: 'isVerified', header: 'Verified', format: (v) => (v ? 'Yes' : 'No') },
  {
    key: 'createdAt',
    header: 'Joined',
    format: (v) => (v ? new Date(v as string).toLocaleDateString('en-US') : ''),
  },
];

function escapeCsvValue(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Builds a CSV file client-side from an array of objects and triggers a
 * download. No backend endpoint required — fine for the row counts an
 * admin panel deals with (hundreds to low thousands).
 */
export function exportToCsv(
  filenameBase: string,
  columns: CsvColumn[],
  rows: Record<string, unknown>[]
): void {
  const header = columns.map((c) => escapeCsvValue(c.header)).join(',');
  const lines = rows.map((row) =>
    columns
      .map((col) => {
        const raw = row[col.key];
        const formatted = col.format ? col.format(raw, row) : raw == null ? '' : String(raw);
        return escapeCsvValue(formatted);
      })
      .join(',')
  );

  const csvContent = [header, ...lines].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `${filenameBase}-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}