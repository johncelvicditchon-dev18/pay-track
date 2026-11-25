import { doc, getDoc } from "firebase/firestore";
import { db } from "./firebase";
import { normalizeStudentId } from "./students";

/*
 * Payment records live in the Firestore `paymentRecords` collection.
 * The document ID is the normalized Student ID (for example 2024-00123).
 * Finance staff create and update these documents from the Firebase console
 * or a trusted admin tool; the app only reads them.
 */
export const PAYMENT_RECORDS_COLLECTION = "paymentRecords";

function recordDocId(studentId) {
  return encodeURIComponent(normalizeStudentId(studentId));
}

function text(value) {
  return String(value == null ? "" : value).trim();
}

function normalizeRecord(studentId, data = {}) {
  return {
    studentId,
    name: text(data.name) || studentId,
    institute: text(data.institute),
    program: text(data.program),
    yearLevel: text(data.yearLevel),
    organization: text(data.organization),
    statement: text(data.statement),
    updated: text(data.updated),
    nextDue: text(data.nextDue) || "—",
    charges: Array.isArray(data.charges) ? data.charges : [],
    payments: Array.isArray(data.payments) ? data.payments : [],
  };
}

/**
 * Read one student's payment record. Returns null when no document exists.
 * Firestore errors are rethrown so the caller can show the right message.
 */
export async function fetchPaymentRecord(studentId) {
  const normalized = normalizeStudentId(studentId);
  if (!normalized) return null;

  const snapshot = await getDoc(
    doc(db, PAYMENT_RECORDS_COLLECTION, recordDocId(normalized))
  );

  if (!snapshot.exists()) return null;
  return normalizeRecord(normalized, snapshot.data());
}

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
