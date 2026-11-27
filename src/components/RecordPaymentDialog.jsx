import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { recordTypedPayment } from "../lib/paymentRecords";
import { listPaymentTypes } from "../lib/paymentTypes";

function money(value) {
  return `₱${Number(value || 0).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function RecordPaymentDialog({ student, council, onClose, onSaved }) {
  const { user } = useAuth();
  const toast = useToast();
  const dialogRef = useRef(null);
  const [types, setTypes] = useState([]);
  const [typeId, setTypeId] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [reference, setReference] = useState("");
  const [method, setMethod] = useState("Cash · Finance Office");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const selectedType = useMemo(
    () => types.find((type) => type.id === typeId) || null,
    [types, typeId]
  );

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
    return () => {
      if (dialog?.open) dialog.close();
    };
  }, []);

  useEffect(() => {
    let active = true;

    listPaymentTypes(council)
      .then((rows) => {
        if (active) setTypes(rows);
      })
      .catch((loadError) => {
        console.error("[payment-dialog] Could not load payment types:", loadError);
        if (active) setError("Could not load payment types. Check your connection.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [council]);

  const handleTypeChange = (nextId) => {
    setTypeId(nextId);
    const type = types.find((item) => item.id === nextId);
    if (type) setAmount(type.amount ? Number(type.amount).toFixed(2) : "");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (busy) return;

    if (!selectedType) {
      setError("Select a payment type.");
      return;
    }
    if (!(Number(amount) > 0)) {
      setError("Enter an amount greater than zero.");
      return;
    }
    if (!date) {
      setError("Select the payment date.");
      return;
    }
    if (!reference.trim()) {
      setError("Enter the OR or reference number.");
      return;
    }

    setError("");
    setBusy(true);

    try {
      await recordTypedPayment({
        council,
        studentId: student.studentId,
        studentName: [student.firstName, student.middleName, student.lastName]
          .filter(Boolean)
          .join(" ")
          .trim(),
        type: selectedType,
        amount: Number(amount),
        date,
        reference: reference.trim(),
        method: method.trim(),
        officer: user,
      });

      toast(
        "Payment recorded",
        `${money(amount)} recorded for ${student.firstName} ${student.lastName}.`,
        "success"
      );
      onSaved?.();
      onClose?.();
    } catch (saveError) {
      console.error("[payment-dialog] Could not record payment:", saveError);
      setError("Couldn't save the payment. Check your session and Firestore rules.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <dialog
      className="edit-dialog"
      ref={dialogRef}
      aria-labelledby="record-payment-title"
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose?.();
      }}
    >
      <form className="edit-form" onSubmit={handleSubmit} noValidate>
        <header className="edit-form__head">
          <h2 id="record-payment-title">Record payment</h2>
          <button
            className="edit-form__close"
            type="button"
            onClick={onClose}
            aria-label="Close"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </header>

        <p className="payment-dialog__student">
          {student.firstName} {student.lastName} · {student.studentId}
        </p>

        <div className="edit-grid">
          <div className="field field--wide">
            <label htmlFor="record-payment-type">Payment Type</label>
            <select
              id="record-payment-type"
              value={typeId}
              onChange={(event) => handleTypeChange(event.target.value)}
              disabled={loading}
              required
            >
              <option value="" disabled>
                {loading ? "Loading payment types…" : "Select a payment type"}
              </option>
              {types.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name} · {money(type.amount)}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="record-payment-amount">Amount paid</label>
            <input
              id="record-payment-amount"
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder="0.00"
              required
            />
          </div>

          <div className="field">
            <label htmlFor="record-payment-date">Payment date</label>
            <input
              id="record-payment-date"
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              required
            />
          </div>

          <div className="field">
            <label htmlFor="record-payment-ref">OR / Reference</label>
            <input
              id="record-payment-ref"
              type="text"
              value={reference}
              onChange={(event) => setReference(event.target.value)}
              placeholder="OR-2026-00000"
              required
            />
          </div>

          <div className="field">
            <label htmlFor="record-payment-method">Method</label>
            <input
              id="record-payment-method"
              type="text"
              value={method}
              onChange={(event) => setMethod(event.target.value)}
            />
          </div>
        </div>

        {error ? (
          <p className="edit-form__error" role="alert">
            {error}
          </p>
        ) : null}

        <footer className="edit-form__actions">
          <button className="btn btn--outline btn--sm" type="button" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn--primary btn--sm" type="submit" disabled={busy}>
            {busy ? "Saving…" : "Save payment"}
          </button>
        </footer>
      </form>
    </dialog>
  );
}
