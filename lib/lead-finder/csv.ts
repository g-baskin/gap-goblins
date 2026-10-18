/**
 * Minimal RFC 4180 CSV reader/writer (no dependency: none is in package.json).
 * Handles quoted fields, escaped quotes, commas and newlines inside quotes,
 * CRLF/LF line endings and a UTF-8 BOM.
 */

export const CSV_MAX_BYTES = 5 * 1024 * 1024;
export const CSV_MAX_ROWS = 5000;

export class CsvLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CsvLimitError";
  }
}

export interface ParsedCsv {
  headers: string[];
  rows: Record<string, string>[];
}

export function byteLength(text: string): number {
  return new TextEncoder().encode(text).length;
}

/** Parses CSV text into header-keyed rows. Throws CsvLimitError over the limits. */
export function parseCsv(
  input: string,
  limits: { maxBytes?: number; maxRows?: number } = {},
): ParsedCsv {
  const maxBytes = limits.maxBytes ?? CSV_MAX_BYTES;
  const maxRows = limits.maxRows ?? CSV_MAX_ROWS;
  if (byteLength(input) > maxBytes) {
    throw new CsvLimitError(`File is larger than ${Math.round(maxBytes / 1024 / 1024)} MB`);
  }
  const text = input.charCodeAt(0) === 0xfeff ? input.slice(1) : input;

  const records: string[][] = [];
  let field = "";
  let record: string[] = [];
  let inQuotes = false;
  let i = 0;

  const endRecord = () => {
    record.push(field);
    field = "";
    // Skip blank lines (a single empty field).
    if (!(record.length === 1 && record[0] === "")) {
      records.push(record);
      // +1 for the header row.
      if (records.length > maxRows + 1) {
        throw new CsvLimitError(`File has more than ${maxRows.toLocaleString("en-US")} rows`);
      }
    }
    record = [];
  };

  while (i < text.length) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      field += ch;
      i += 1;
      continue;
    }
    if (ch === '"' && field === "") {
      inQuotes = true;
      i += 1;
      continue;
    }
    if (ch === ",") {
      record.push(field);
      field = "";
      i += 1;
      continue;
    }
    if (ch === "\r" || ch === "\n") {
      endRecord();
      i += ch === "\r" && text[i + 1] === "\n" ? 2 : 1;
      continue;
    }
    field += ch;
    i += 1;
  }
  if (inQuotes) throw new CsvLimitError("File has an unterminated quoted field");
  if (field !== "" || record.length > 0) endRecord();

  if (records.length === 0) return { headers: [], rows: [] };
  const headers = records[0].map((h) => h.trim());
  const rows = records.slice(1).map((values) => {
    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      if (header) row[header] = values[index] ?? "";
    });
    return row;
  });
  return { headers, rows };
}

const FORMULA_PREFIX = /^[=+\-@\t\r]/;

/**
 * Makes a value safe to open in a spreadsheet: cells that start with a formula
 * trigger (= + - @ tab CR) are prefixed with a single quote so they render as
 * text. Then applies normal CSV quoting.
 */
export function toSafeCsvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  let text = String(value);
  if (FORMULA_PREFIX.test(text)) text = `'${text}`;
  if (/[",\r\n]/.test(text)) text = `"${text.replace(/"/g, '""')}"`;
  return text;
}

export function toCsv(headers: string[], rows: unknown[][]): string {
  const lines = [headers.map(toSafeCsvCell).join(",")];
  for (const row of rows) lines.push(row.map(toSafeCsvCell).join(","));
  return `${lines.join("\r\n")}\r\n`;
}
