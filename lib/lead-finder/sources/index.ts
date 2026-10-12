import type { LeadSource, LeadSourceId } from "../types";
import { csvImportSource } from "./csv-import";
import { fixtureSource } from "./fixture";
import { omkarDesktopSource } from "./omkar-desktop";

export const leadSources: Record<LeadSourceId, LeadSource> = {
  fixture: fixtureSource,
  "csv-import": csvImportSource,
  "omkar-desktop": omkarDesktopSource,
};

export function getLeadSource(id: string): LeadSource | null {
  return Object.hasOwn(leadSources, id) ? leadSources[id as LeadSourceId] : null;
}
