/**
 * Background map tiles for the territory editor. Defaults to OpenStreetMap's public tile server,
 * whose usage policy only allows light use; set MAP_TILE_URL (and MAP_TILE_ATTRIBUTION) to a
 * production tile provider for heavier use. Read on the server and passed to the editor, and
 * the tile host is the only map host allowed by the CSP.
 */
const DEFAULT_TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const DEFAULT_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

export interface MapTileConfig {
  url: string;
  attribution: string;
}

/** The configured tile URL when it is an https template with {z}/{x}/{y}; otherwise the default. */
export function mapTileConfig(
  env: Record<string, string | undefined> = process.env,
): MapTileConfig {
  const url = env.MAP_TILE_URL?.trim() ?? "";
  const valid =
    url.startsWith("https://") &&
    ["{z}", "{x}", "{y}"].every((part) => url.includes(part)) &&
    tileOrigin(url) !== null;
  return {
    url: valid ? url : DEFAULT_TILE_URL,
    attribution: valid ? (env.MAP_TILE_ATTRIBUTION?.trim() ?? "") : DEFAULT_ATTRIBUTION,
  };
}

/**
 * The tile host as a CSP source (e.g. "https://tile.openstreetmap.org"), or null when it cannot
 * be expressed safely. Leaflet {s} subdomain templates become a single wildcard subdomain.
 */
export function tileOrigin(url: string): string | null {
  try {
    const host = new URL(url.replaceAll(/\{[a-z]\}/g, "0")).host;
    const template = url.match(/^https:\/\/([^/]+)\//)?.[1] ?? "";
    if (!/^[a-z0-9.{}:-]+$/i.test(template)) return null;
    if (template.startsWith("{s}.")) return `https://*.${template.slice(4)}`;
    if (template.includes("{")) return null;
    return `https://${host}`;
  } catch {
    return null;
  }
}
