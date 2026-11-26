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

/* Positions offered by each council type. Add or edit here to maintain. */
export const ISC_POSITIONS = [
  "GOVERNOR",
  "VICE-GOVERNOR",
  "SECRETARY",
  "TREASURER",
  "AUDITOR",
  "BM ACADEMIC AFFAIRS",
  "BM EXTERNAL AFFAIRS",
  "BM SPORT DEVELOPMENT",
  "BM SOCIO-CULTURAL",
  "BM ENVIRONMENTAL AFFAIRS",
];

export const SRO_POSITIONS = [
  "PRESIDENT",
  "VICE-PRESIDENT",
  "SECRETARY",
  "TREASURER",
  "AUDITOR",
  "1ST YEAR REPRESENTATIVE",
  "2ND YEAR REPRESENTATIVE",
  "3RD YEAR REPRESENTATIVE",
  "4TH YEAR REPRESENTATIVE",
];

export function positionsForCouncil(council) {
  const code = normalizeCouncil(council);
  if (code.startsWith("ISC-")) return ISC_POSITIONS;
  if (code.startsWith("SRO-")) return SRO_POSITIONS;
  return [];
}
