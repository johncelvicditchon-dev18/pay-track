/*
 * Front-end demo records used by the student-ID payment lookup.
 * Replace this file with a real API call when the finance backend
 * is available.
 */
export const DEMO_RECORDS = {
  "2024-00123": {
    name: "Maria Santos",
    institute: "ICS",
    program: "BSCS",
    yearLevel: "4TH YEAR",
    balance: 12450,
    paid: 20300,
    total: 32750,
    nextDue: "October 15, 2026",
    payments: [
      {
        label: "Tuition — Prelim",
        date: "August 15, 2026",
        ref: "A-10428",
        amount: 10000,
      },
      {
        label: "Laboratory fees",
        date: "September 2, 2026",
        ref: "A-10577",
        amount: 3500,
      },
      {
        label: "Tuition — Prefinal",
        date: "September 28, 2026",
        ref: "A-10702",
        amount: 6800,
      },
    ],
  },
  "2023-00456": {
    name: "Juan Dela Cruz",
    institute: "IBFS",
    program: "BSBA-FM",
    yearLevel: "3RD YEAR",
    balance: 8200,
    paid: 20700,
    total: 28900,
    nextDue: "October 20, 2026",
    payments: [
      {
        label: "Tuition — Prelim",
        date: "August 12, 2026",
        ref: "B-20114",
        amount: 7500,
      },
      {
        label: "Miscellaneous fees",
        date: "August 28, 2026",
        ref: "B-20203",
        amount: 3200,
      },
      {
        label: "Tuition — Midterm",
        date: "September 25, 2026",
        ref: "B-20388",
        amount: 10000,
      },
    ],
  },
  "2025-00789": {
    name: "Ana Reyes",
    institute: "ITE",
    program: "BEED",
    yearLevel: "2ND YEAR",
    balance: 0,
    paid: 25600,
    total: 25600,
    nextDue: "Fully paid for this semester",
    payments: [
      {
        label: "Tuition — Full semester",
        date: "August 5, 2026",
        ref: "C-30021",
        amount: 20000,
      },
      {
        label: "Laboratory fees",
        date: "August 5, 2026",
        ref: "C-30022",
        amount: 2600,
      },
      {
        label: "Miscellaneous fees",
        date: "August 5, 2026",
        ref: "C-30023",
        amount: 3000,
      },
    ],
  },
};
