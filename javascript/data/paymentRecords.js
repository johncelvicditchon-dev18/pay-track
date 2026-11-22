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
    balance: 450,
    paid: 1300,
    total: 1750,
    nextDue: "October 15, 2026",
    payments: [
      {
        label: "Activity contribution — Intramurals",
        date: "August 15, 2026",
        ref: "A-10428",
        amount: 500,
      },
      {
        label: "ICS membership fee",
        date: "September 2, 2026",
        ref: "A-10577",
        amount: 300,
      },
      {
        label: "T-shirt fee (partial)",
        date: "September 28, 2026",
        ref: "A-10702",
        amount: 500,
      },
    ],
  },
  "2023-00456": {
    name: "Juan Dela Cruz",
    institute: "IBFS",
    program: "BSBA-FM",
    yearLevel: "3RD YEAR",
    balance: 600,
    paid: 900,
    total: 1500,
    nextDue: "October 20, 2026",
    payments: [
      {
        label: "Activity contribution — Acquaintance",
        date: "August 12, 2026",
        ref: "B-20114",
        amount: 400,
      },
      {
        label: "IBFS membership fee",
        date: "August 28, 2026",
        ref: "B-20203",
        amount: 500,
      },
    ],
  },
  "2025-00789": {
    name: "Ana Reyes",
    institute: "ITE",
    program: "BEED",
    yearLevel: "2ND YEAR",
    balance: 0,
    paid: 1400,
    total: 1400,
    nextDue: "Fully paid for this semester",
    payments: [
      {
        label: "Activity contribution — Field trip",
        date: "August 5, 2026",
        ref: "C-30021",
        amount: 500,
      },
      {
        label: "ITE membership fee",
        date: "August 5, 2026",
        ref: "C-30022",
        amount: 400,
      },
      {
        label: "T-shirt fee",
        date: "August 5, 2026",
        ref: "C-30023",
        amount: 500,
      },
    ],
  },
};
