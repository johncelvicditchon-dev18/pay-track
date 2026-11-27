import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  where,
} from "firebase/firestore";
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

/**
 * Public student lookup: every payment record that carries this Student ID.
 * Used by the student portal and the landing page.
 */
export async function fetchStudentPayments(studentId) {
  const normalized = normalizeStudentId(studentId);
  if (!normalized) return [];

  const snapshot = await getDocs(
    query(
      collection(db, PAYMENT_RECORDS_COLLECTION),
      where("studentId", "==", normalized)
    )
  );

  return snapshot.docs.map((entry) => {
    const data = entry.data() || {};
    return normalizeRecord(
      normalizeCouncil(data.council),
      normalized,
      data
    );
  });
}

/**
 * Record a payment against a catalog payment type. Creates or updates the
 * charge, appends a verified receipt, and stores which officer assisted.
 */
export async function recordTypedPayment({
  council,
  studentId,
  studentName,
  type,
  amount,
  date,
  method,
  reference,
  officer,
}) {
  const code = normalizeCouncil(council);
  const id = normalizeStudentId(studentId);
  const paymentAmount = Number(amount || 0);
  const typeName = String(type?.name || type?.label || "").trim();
  const chargeAmount = Number(type?.amount || 0) || paymentAmount;

  if (!code || !id || !typeName || !(paymentAmount > 0)) {
    throw new Error("Missing student, payment type, or amount.");
  }

  const referenceDoc = doc(
    db,
    PAYMENT_RECORDS_COLLECTION,
    recordDocId(code, id)
  );
  const snapshot = await getDoc(referenceDoc);
  const existing = snapshot.exists()
    ? normalizeRecord(code, id, snapshot.data())
    : { studentId: id, council: code, name: "", charges: [], payments: [] };

  const charges = existing.charges.map((charge) => ({
    ...charge,
    amount: Number(charge.amount || 0),
    paid: Number(charge.paid || 0),
  }));

  const open = charges.find(
    (charge) =>
      !charge.locked &&
      String(charge.typeLabel || charge.label || "").toLowerCase() ===
        typeName.toLowerCase() &&
      charge.paid < charge.amount
  );

  if (open) {
    open.paid = Math.min(open.amount, open.paid + paymentAmount);
    open.assessedBy = officer?.name || open.assessedBy || "";
  } else {
    charges.push({
      id: `charge-${Date.now()}`,
      label: typeName,
      typeLabel: typeName,
      category: type?.category || "Miscellaneous",
      scope: type?.scope || "Organization",
      unit: code,
      amount: chargeAmount,
      paid: Math.min(paymentAmount, chargeAmount),
      dueDate: "",
      locked: false,
      assessedBy: officer?.name || "",
    });
  }

  const payments = existing.payments.slice();
  payments.push({
    id: `pay-${Date.now()}`,
    label: typeName,
    date: date || new Date().toISOString().slice(0, 10),
    ref: reference || "",
    method: method || "",
    amount: paymentAmount,
    status: "Verified",
    recordedBy: officer?.name || "",
    recordedByPosition: officer?.position || "",
    recordedById: officer?.studentId || "",
  });

  const total = charges.reduce((sum, charge) => sum + charge.amount, 0);
  const paid = charges.reduce((sum, charge) => sum + charge.paid, 0);

  const nextRecord = {
    council: code,
    studentId: id,
    name: existing.name || studentName || id,
    institute: existing.institute || "",
    program: existing.program || "",
    yearLevel: existing.yearLevel || "",
    statement: existing.statement || "",
    charges,
    payments,
    updated: new Date().toLocaleDateString("en-PH", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
    nextDue:
      total > paid ? "See charges" : "Fully paid for this semester",
  };

  await setDoc(referenceDoc, nextRecord);
  return normalizeRecord(code, id, nextRecord);
}

/**
 * Freeze or unfreeze one charge inside a student's payment record.
 */
export async function setChargeLock({
  council,
  studentId,
  chargeId,
  index,
  locked,
}) {
  const code = normalizeCouncil(council);
  const id = normalizeStudentId(studentId);
  const referenceDoc = doc(
    db,
    PAYMENT_RECORDS_COLLECTION,
    recordDocId(code, id)
  );
  const snapshot = await getDoc(referenceDoc);
  if (!snapshot.exists()) throw new Error("Payment record not found.");

  const record = normalizeRecord(code, id, snapshot.data());
  const charges = record.charges.map((charge) => ({ ...charge }));

  const target =
    (chargeId && charges.find((charge) => charge.id === chargeId)) ||
    (Number.isInteger(index) ? charges[index] : null);

  if (!target) throw new Error("Charge not found.");

  target.locked = Boolean(locked);

  await setDoc(referenceDoc, {
    ...snapshot.data(),
    council: code,
    studentId: id,
    charges,
  });

  return { ...record, charges };
}

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
