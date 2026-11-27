import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";
import { db } from "./firebase";
import { normalizeCouncil } from "../data/councils";

export const PAYMENT_TYPES_COLLECTION = "paymentTypes";

export async function listPaymentTypes(council) {
  const code = normalizeCouncil(council);
  if (!code) return [];

  const snapshot = await getDocs(
    query(collection(db, PAYMENT_TYPES_COLLECTION), where("council", "==", code))
  );

  return snapshot.docs
    .map((entry) => {
      const data = entry.data() || {};
      return {
        id: entry.id,
        name: data.name || data.label || "Payment",
        label: data.label || data.name || "Payment",
        amount: Number(data.amount || 0),
        council: data.council || code,
        scope: data.scope || "Organization",
        category: data.category || "Miscellaneous",
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function createPaymentType({ name, amount, council }) {
  const code = normalizeCouncil(council);
  const paymentName = String(name || "").trim().toUpperCase();
  const paymentAmount = Number(amount || 0);

  if (!code || !paymentName || !(paymentAmount > 0)) {
    throw new Error("Enter a payment type and an amount greater than zero.");
  }

  const reference = doc(collection(db, PAYMENT_TYPES_COLLECTION));
  await setDoc(reference, {
    name: paymentName,
    label: paymentName,
    amount: paymentAmount,
    council: code,
    scope: "Organization",
    category: "Miscellaneous",
    createdAt: serverTimestamp(),
  });

  return { id: reference.id, name: paymentName, label: paymentName, amount: paymentAmount };
}

export async function deletePaymentType(typeId) {
  if (!typeId) return;
  await deleteDoc(doc(db, PAYMENT_TYPES_COLLECTION, typeId));
}
