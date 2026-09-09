/**
 * The backend emits naive UTC timestamps (no "Z"/offset suffix, e.g.
 * "2026-09-08T09:58:30.855381"). `new Date(...)` treats a timezone-less
 * ISO string as LOCAL time, not UTC, per the ECMA-262 Date Time String
 * Format spec -- which silently corrupts any cooldown/age math whenever the
 * viewer's timezone isn't UTC+0. Always go through this helper instead of
 * calling `new Date()` directly on a value from the API.
 */
export function parseServerDate(isoString) {
  if (!isoString) return null;
  const hasOffset = /[zZ]|[+-]\d{2}:?\d{2}$/.test(isoString);
  return new Date(hasOffset ? isoString : `${isoString}Z`);
}
