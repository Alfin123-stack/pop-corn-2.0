import type { Audience } from "./types";

// US movie + TV Parental Guidelines, plus common labels from other countries.
const KIDS = new Set([
  "G", "PG", "TV-Y", "TV-Y7", "TV-Y7-FV", "TV-G", "TV-PG",
  "U", "SU", "L", "ATP", "AL", "TP", "ALL",
]);
const TEEN = new Set(["PG-13", "TV-14", "12A", "M"]);
const ADULT = new Set(["R", "NC-17", "TV-MA", "X", "A", "18+", "21+"]);
const UNRATED = new Set(["NR", "UR", "UNRATED", "NOT RATED", ""]);

/**
 * Maps an age certification string (any country) to one of three audience groups.
 * Numeric labels are read as minimum age: up to 9 = kids, 10-14 = teens, 15+ = adults.
 */
export function audienceFromCertification(cert: string | null | undefined): Audience {
  if (!cert) return "unrated";
  const c = cert.trim().toUpperCase();
  if (UNRATED.has(c)) return "unrated";
  if (KIDS.has(c)) return "kids";
  if (TEEN.has(c)) return "teen";
  if (ADULT.has(c)) return "adult";

  const numeric = c.match(/^(\d{1,2})\+?$/);
  if (numeric) {
    const age = Number(numeric[1]);
    if (age <= 9) return "kids";
    if (age <= 14) return "teen";
    return "adult";
  }
  return "unrated";
}
