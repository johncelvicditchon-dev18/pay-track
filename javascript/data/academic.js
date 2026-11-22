export const YEAR_LEVELS = ["1ST YEAR", "2ND YEAR", "3RD YEAR", "4TH YEAR"];

/*
 * Institute → program mapping used by the sign-up form.
 * Keep this as the single source of truth so validation and the
 * program dropdown can never drift apart.
 */
export const INSTITUTE_PROGRAMS = {
  ICS: ["BSCS"],
  IAS: ["AB COMM", "AB ENGLISH", "AB POLSCI"],
  ITE: ["BEED", "BSED-ENGLISH", "BSED-FILIPINO", "BSED-MATH", "BSED-SOCSTUD"],
  IHS: ["BS-MIDWIFERY"],
  IBFS: ["BSBA-FM", "BSBA-HRM", "BSBA-MM", "BSOA"],
  ICJE: ["BS-CRIM", "BSISM"],
};

export const INSTITUTES = Object.keys(INSTITUTE_PROGRAMS);
