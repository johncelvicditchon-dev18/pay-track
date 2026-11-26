import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";
import { db } from "./firebase";
import { normalizeStudentId } from "./students";
import { normalizeCouncil } from "../data/councils";

/*
 * Payment records live in the Firestore `paymentRecords` collection.
 * The document ID is "<council>::<studentId>" (for example
 * "ISC-ICS::STUDENTID"), so every council keeps its own record for a student.
 * Finance staff create and update these documents from the Firebase console
 * or a trusted admin tool; the app only reads them.
 */
export const PAYMENT_RECORDS_COLLECTION = "paymentRecords";

function recordDocId(council, studentId) {
  return `${normalizeCouncil(council)}::${normalizeStudentId(studentId)}`;
}

function text(value) {
  return String(value == null ? "" : value).trim();
}

function normalizeRecord(council, studentId, data = {}) {
  return {
    studentId,
    council: normalizeCouncil(data.council) || council,
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
export async function fetchPaymentRecord(studentId, council) {
  const normalized = normalizeStudentId(studentId);
  const normalizedCouncil = normalizeCouncil(council);
  if (!normalized || !normalizedCouncil) return null;

  const snapshot = await getDoc(
    doc(db, PAYMENT_RECORDS_COLLECTION, recordDocId(normalizedCouncil, normalized))
  );

  if (!snapshot.exists()) return null;
  return normalizeRecord(normalizedCouncil, normalized, snapshot.data());
}

/**
 * List every payment record that belongs to one council. Used by the
 * dashboard's Payments tab.
 */
export async function listPaymentRecords(council) {
  const code = normalizeCouncil(council);
  if (!code) return [];

  const snapshot = await getDocs(
    query(
      collection(db, PAYMENT_RECORDS_COLLECTION),
      where("council", "==", code)
    )
  );

  return snapshot.docs.map((entry) => {
    const docId = entry.id;
    const studentId = docId.includes("::")
      ? docId.slice(docId.indexOf("::") + 2)
      : docId;
    return normalizeRecord(code, studentId, entry.data());
  });
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
