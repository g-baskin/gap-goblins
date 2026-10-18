type MediaKind = "avatars" | "logos";

/**
 * Only new, server-issued references may authorize cleanup. Legacy references
 * have no provable owner and are deliberately retained in storage, not deleted.
 * Settings routes must never accept caller-supplied replacements for these URLs.
 */
export function ownedMediaKey(kind: MediaKind, ownerId: string, url: unknown): string | null {
  if (!/^[a-zA-Z0-9_-]+$/.test(ownerId) || typeof url !== "string") return null;
  const prefix = `/api/media/${kind}/${ownerId}--`;
  if (!url.startsWith(prefix)) return null;
  const filename = url.slice(prefix.length);
  const pattern =
    kind === "avatars"
      ? /^\d+-[a-f0-9]{16}\.(?:png|jpe?g|webp)$/
      : /^\d+-[a-f0-9]{16}\.(?:png|jpe?g|webp|svg)$/;
  if (!pattern.test(filename)) return null;
  return `${kind}/${ownerId}--${filename}`;
}
