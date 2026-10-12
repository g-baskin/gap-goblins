/**
 * CSV/JSON import lead source: omkar Google Maps Extractor exports (CSV or JSON)
 * and generic CSVs. Limits: 5 MB and 5,000 rows.
 */
import { byteLength, CSV_MAX_BYTES, CSV_MAX_ROWS, CsvLimitError, parseCsv } from "../csv";
import { isOmkarExport, normalizeRecord, resolveColumns } from "../normalize";
import { type LeadSource, LeadSourceInputError, type NormalizedBusiness } from "../types";

export interface ImportResult {
  format: "omkar" | "generic";
  businesses: NormalizedBusiness[];
  /** Rows that could not be used (no business name). */
  rejectedRows: number;
  totalRows: number;
  mappedColumns: Record<string, string>;
}

function parseJsonRecords(content: string): Record<string, unknown>[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new LeadSourceInputError("The JSON file could not be read");
  }
  const list = Array.isArray(parsed)
    ? parsed
    : parsed &&
        typeof parsed === "object" &&
        Array.isArray((parsed as { results?: unknown }).results)
      ? (parsed as { results: unknown[] }).results
      : null;
  if (!list) throw new LeadSourceInputError("The JSON file must contain a list of businesses");
  if (list.length > CSV_MAX_ROWS) {
    throw new LeadSourceInputError(
      `File has more than ${CSV_MAX_ROWS.toLocaleString("en-US")} rows`,
    );
  }
  return list.filter((item): item is Record<string, unknown> => !!item && typeof item === "object");
}

/** Parses an uploaded export. Throws LeadSourceInputError for bad files. */
export function importBusinesses(file: { name: string; content: string }): ImportResult {
  if (byteLength(file.content) > CSV_MAX_BYTES) {
    throw new LeadSourceInputError("File is larger than 5 MB");
  }
  const isJson = /\.json$/i.test(file.name) || /^\s*[[{]/.test(file.content);
  let records: Record<string, unknown>[];
  let headers: string[];
  if (isJson) {
    records = parseJsonRecords(file.content);
    headers = Array.from(new Set(records.flatMap((record) => Object.keys(record))));
  } else {
    try {
      const parsed = parseCsv(file.content);
      records = parsed.rows;
      headers = parsed.headers;
    } catch (error) {
      if (error instanceof CsvLimitError) throw new LeadSourceInputError(error.message);
      throw error;
    }
  }
  const mapping = resolveColumns(headers);
  if (!mapping.name) {
    throw new LeadSourceInputError(
      "No business name column found. Expected a column such as NAME, Name or Business Name.",
    );
  }
  const businesses: NormalizedBusiness[] = [];
  let rejectedRows = 0;
  for (const record of records) {
    const business = normalizeRecord(record, mapping);
    if (business) businesses.push(business);
    else rejectedRows += 1;
  }
  return {
    format: isOmkarExport(headers) ? "omkar" : "generic",
    businesses,
    rejectedRows,
    totalRows: records.length,
    mappedColumns: mapping as Record<string, string>,
  };
}

export const csvImportSource: LeadSource = {
  id: "csv-import",
  label: "CSV / JSON import (omkar export or generic CSV)",
  async health() {
    return { available: true, contract: "verified", message: "Upload a CSV or JSON export" };
  },
  async fetch(_query, context) {
    if (!context.file) throw new LeadSourceInputError("A CSV or JSON file is required");
    return importBusinesses(context.file).businesses;
  },
};
