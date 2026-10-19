/**
 * CSV Exporter with UTF-8 BOM for Microsoft Excel & Google Sheets compatibility
 */

export function downloadCSV(filename: string, headers: string[], rows: (string | number)[][]) {
  const escapeCSV = (value: string | number | undefined | null) => {
    if (value === undefined || value === null) return '""';
    const str = String(value).replace(/"/g, '""');
    return `"${str}"`;
  };

  const headerLine = headers.map(escapeCSV).join(';');
  const rowLines = rows.map((row) => row.map(escapeCSV).join(';'));
  const csvContent = '\uFEFF' + [headerLine, ...rowLines].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
