/**
 * US/NANP phone normalisation to E.164 without a dependency.
 * Returns null when the number is not a plausible NANP number (we never guess).
 */
export function toUsE164(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  // Drop an extension ("x123", "ext. 4", "extension 9").
  const withoutExt = trimmed.replace(/\s*(?:ext\.?|extension|x|#)\s*\d+\s*$/i, "");
  const hasPlus = withoutExt.startsWith("+");
  let digits = withoutExt.replace(/\D/g, "");
  if (hasPlus) {
    if (!digits.startsWith("1")) return null; // Non-NANP international number.
    digits = digits.slice(1);
  } else if (digits.length === 11 && digits.startsWith("1")) {
    digits = digits.slice(1);
  }
  if (digits.length !== 10) return null;
  // NANP: area code and exchange both start with 2-9.
  if (!/^[2-9]\d{2}[2-9]\d{6}$/.test(digits)) return null;
  return `+1${digits}`;
}
