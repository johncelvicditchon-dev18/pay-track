/*
 * Front-end demo records used by the student-ID payment lookup.
 *
 * Every charge belongs to either the institute or a recognized student
 * organization, and every payment keeps its official receipt reference.
 * Replace this file with a real API call when the finance backend
 * is available.
 */
export const DEMO_RECORDS = {
  "2024-00123": {
    name: "Maria Santos",
    institute: "ICS",
    program: "BSCS",
    yearLevel: "4TH YEAR",
    organization: "ICS Student Council",
    statement: "A.Y. 2026–2027 · 1st Semester",
    updated: "October 9, 2026",
    nextDue: "October 15, 2026",
    charges: [
      {
        id: "ics-activity-intramurals",
        label: "Activity contribution — Intramurals",
        category: "Activity",
        scope: "Institute",
        unit: "ICS",
        amount: 500,
        paid: 500,
        dueDate: "August 15, 2026",
      },
      {
        id: "ics-membership",
        label: "ICS membership fee",
        category: "Membership",
        scope: "Organization",
        unit: "ICS Student Council",
        amount: 300,
        paid: 300,
        dueDate: "September 2, 2026",
      },
      {
        id: "ics-tshirt",
        label: "T-shirt fee",
        category: "T-shirt",
        scope: "Institute",
        unit: "ICS",
        amount: 750,
        paid: 500,
        dueDate: "October 15, 2026",
      },
      {
        id: "ics-misc-id",
        label: "Miscellaneous — Student ID replacement",
        category: "Miscellaneous",
        scope: "Institute",
        unit: "ICS",
        amount: 200,
        paid: 0,
        dueDate: "October 20, 2026",
      },
    ],
    payments: [
      {
        id: "ics-activity-intramurals-1",
        chargeId: "ics-activity-intramurals",
        label: "Intramurals activity fee",
        date: "August 15, 2026",
        ref: "OR-2026-10428",
        amount: 500,
        method: "Cash · Finance Office",
        status: "Verified",
      },
      {
        id: "ics-membership-1",
        chargeId: "ics-membership",
        label: "ICS membership fee",
        date: "September 2, 2026",
        ref: "OR-2026-10577",
        amount: 300,
        method: "Cash · Finance Office",
        status: "Verified",
      },
      {
        id: "ics-tshirt-1",
        chargeId: "ics-tshirt",
        label: "T-shirt fee (partial)",
        date: "September 28, 2026",
        ref: "OR-2026-10702",
        amount: 500,
        method: "GCash · Finance Office",
        status: "Verified",
      },
    ],
  },
  "2023-00456": {
    name: "Juan Dela Cruz",
    institute: "IBFS",
    program: "BSBA-FM",
    yearLevel: "3RD YEAR",
    organization: "IBFS Business Leaders Society",
    statement: "A.Y. 2026–2027 · 1st Semester",
    updated: "October 9, 2026",
    nextDue: "October 20, 2026",
    charges: [
      {
        id: "ibfs-activity-acquaintance",
        label: "Activity contribution — Acquaintance",
        category: "Activity",
        scope: "Institute",
        unit: "IBFS",
        amount: 400,
        paid: 400,
        dueDate: "August 12, 2026",
      },
      {
        id: "ibfs-membership",
        label: "IBFS membership fee",
        category: "Membership",
        scope: "Organization",
        unit: "IBFS Business Leaders Society",
        amount: 500,
        paid: 500,
        dueDate: "August 28, 2026",
      },
      {
        id: "ibfs-tshirt",
        label: "T-shirt fee",
        category: "T-shirt",
        scope: "Institute",
        unit: "IBFS",
        amount: 600,
        paid: 0,
        dueDate: "October 20, 2026",
      },
    ],
    payments: [
      {
        id: "ibfs-activity-acquaintance-1",
        chargeId: "ibfs-activity-acquaintance",
        label: "Acquaintance activity fee",
        date: "August 12, 2026",
        ref: "OR-2026-20114",
        amount: 400,
        method: "Cash · Finance Office",
        status: "Verified",
      },
      {
        id: "ibfs-membership-1",
        chargeId: "ibfs-membership",
        label: "IBFS membership fee",
        date: "August 28, 2026",
        ref: "OR-2026-20203",
        amount: 500,
        method: "Cash · Finance Office",
        status: "Verified",
      },
    ],
  },
  "2025-00789": {
    name: "Ana Reyes",
    institute: "ITE",
    program: "BEED",
    yearLevel: "2ND YEAR",
    organization: "ITE Educators' Guild",
    statement: "A.Y. 2026–2027 · 1st Semester",
    updated: "October 9, 2026",
    nextDue: "Fully paid for this semester",
    charges: [
      {
        id: "ite-activity-field-trip",
        label: "Activity contribution — Field trip",
        category: "Activity",
        scope: "Institute",
        unit: "ITE",
        amount: 500,
        paid: 500,
        dueDate: "August 5, 2026",
      },
      {
        id: "ite-membership",
        label: "ITE membership fee",
        category: "Membership",
        scope: "Organization",
        unit: "ITE Educators' Guild",
        amount: 400,
        paid: 400,
        dueDate: "August 5, 2026",
      },
      {
        id: "ite-tshirt",
        label: "T-shirt fee",
        category: "T-shirt",
        scope: "Institute",
        unit: "ITE",
        amount: 500,
        paid: 500,
        dueDate: "August 5, 2026",
      },
    ],
    payments: [
      {
        id: "ite-activity-field-trip-1",
        chargeId: "ite-activity-field-trip",
        label: "Field trip activity fee",
        date: "August 5, 2026",
        ref: "OR-2026-30021",
        amount: 500,
        method: "Cash · Finance Office",
        status: "Verified",
      },
      {
        id: "ite-membership-1",
        chargeId: "ite-membership",
        label: "ITE membership fee",
        date: "August 5, 2026",
        ref: "OR-2026-30022",
        amount: 400,
        method: "Cash · Finance Office",
        status: "Verified",
      },
      {
        id: "ite-tshirt-1",
        chargeId: "ite-tshirt",
        label: "T-shirt fee",
        date: "August 5, 2026",
        ref: "OR-2026-30023",
        amount: 500,
        method: "GCash · Finance Office",
        status: "Verified",
      },
    ],
  },
};

/*
 * Derives every balance shown in the tracker from the charge list so the
 * overall total, the institute/organization split, and each charge row can
 * never disagree with each other.
 */
export function summarizeRecord(record) {
  const charges = (record.charges || []).map((charge) => {
    const amount = Number(charge.amount || 0);
    const paid = Number(charge.paid || 0);
    return {
      ...charge,
      amount,
      paid,
      balance: Math.max(amount - paid, 0),
    };
  });

  const total = charges.reduce((sum, charge) => sum + charge.amount, 0);
  const paid = charges.reduce((sum, charge) => sum + charge.paid, 0);
  const balance = Math.max(total - paid, 0);
  const percent = total > 0 ? Math.round((paid / total) * 100) : 0;

  const scopes = ["Institute", "Organization"]
    .map((scope) => {
      const items = charges.filter((charge) => charge.scope === scope);
      const scopeTotal = items.reduce((sum, charge) => sum + charge.amount, 0);
      const scopePaid = items.reduce((sum, charge) => sum + charge.paid, 0);

      return {
        scope,
        unit: items[0]?.unit || "—",
        count: items.length,
        total: scopeTotal,
        paid: scopePaid,
        balance: Math.max(scopeTotal - scopePaid, 0),
      };
    })
    .filter((scope) => scope.count > 0);

  return { charges, total, paid, balance, percent, scopes };
}
