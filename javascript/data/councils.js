/*
 * Councils and student organizations. Every officer account belongs to one of
 * these, and student/payment records are scoped to the officer's council so
 * officers from the same council share the same records.
 */
export const COUNCILS = [
  "ISC-ICS",
  "ISC-IAS",
  "ISC-IHS",
  "ISC-ITE",
  "ISC-IBFS",
  "ISC-ICJE",
  "SRO-JPEG.COM",
  "SRO-ISMTSU",
  "SRO-VOSS",
  "SRO-CITU",
  "SRO-AYOA",
  "SRO-GLEE-C",
  "SRO-PSC",
  "SRO-YLS",
  "SRO-JEHRO",
  "SRO-TMS-FIL",
  "SRO-JFINEX",
  "SRO-COMMUNITY",
  "SRO-GAME",
  "SRO-CRCYC",
  "SRO-TEEM",
  "SRO-JAMEX",
];

export function normalizeCouncil(value) {
  return String(value == null ? "" : value).trim().toUpperCase();
}

export function isCouncil(value) {
  return COUNCILS.includes(normalizeCouncil(value));
}
