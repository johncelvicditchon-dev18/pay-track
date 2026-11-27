import { useCallback, useEffect, useMemo, useState } from "react";
import { useToast } from "../context/ToastContext";
import { normalizeStudentId } from "../lib/students";
import { createPaymentType, listPaymentTypes } from "../lib/paymentTypes";
import { listPaymentRecords, setChargeLock } from "../lib/paymentRecords";
import { loadStudents, loadStudentsFromFirestore } from "../lib/students";

function money(value) {
  return `₱${Number(value || 0).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function PaymentRecordPanel({ council }) {
  const toast = useToast();
  const [records, setRecords] = useState([]);
  const [students, setStudents] = useState([]);
  const [types, setTypes] = useState([]);
  const [status, setStatus] = useState("loading");
  const [typeName, setTypeName] = useState("");
  const [typeAmount, setTypeAmount] = useState("");
  const [hint, setHint] = useState("");
  const [busy, setBusy] = useState(false);
  const [locking, setLocking] = useState("");

  const load = useCallback(async () => {
    if (!council) {
      setStatus("empty");
      return;
    }

    setStatus("loading");

    try {
      const [paymentRows, studentRows, typeRows] = await Promise.all([
        listPaymentRecords(council),
        loadStudentsFromFirestore(council).catch(() => loadStudents(council)),
        listPaymentTypes(council),
      ]);
      setRecords(paymentRows);
      setStudents(studentRows);
      setTypes(typeRows);
      setStatus("ready");
    } catch (error) {
      console.error("[payment-record] Load failed:", error);
      setStatus("error");
    }
  }, [council]);

  useEffect(() => {
    load();
  }, [load]);

  const rows = useMemo(() => {
    const names = new Map(
      students.map((student) => [
        normalizeStudentId(student.studentId),
        [student.firstName, student.middleName, student.lastName]
          .filter(Boolean)
          .join(" ")
          .trim(),
      ])
    );

    return records
      .flatMap((record) =>
        (record.charges || []).map((charge, index) => {
          const studentId = normalizeStudentId(record.studentId);
          let recordedBy = charge.assessedBy || "";

          if (!recordedBy && Array.isArray(record.payments)) {
            const match = record.payments.find(
              (payment) =>
                String(payment.label || "").toLowerCase() ===
                String(charge.typeLabel || charge.label || "").toLowerCase()
            );
            recordedBy = match?.recordedBy || "";
          }

          return {
            key: `${record.studentId}-${charge.id || index}`,
            studentId,
            name: names.get(studentId) || record.name || studentId,
            charge,
            index,
            recordedBy,
          };
        })
      )
      .sort(
        (a, b) =>
          a.name.localeCompare(b.name, "en", { sensitivity: "base" }) ||
          String(a.charge.typeLabel || a.charge.label || "").localeCompare(
            String(b.charge.typeLabel || b.charge.label || "")
          )
      );
  }, [records, students]);

  const handleCreateType = async (event) => {
    event.preventDefault();

    if (!typeName.trim()) {
      setHint("Enter the payment type.");
      return;
    }
    if (!(Number(typeAmount) > 0)) {
      setHint("Enter an amount greater than zero.");
      return;
    }

    setBusy(true);
    setHint("");

    try {
      await createPaymentType({
        name: typeName,
        amount: Number(typeAmount),
        council,
      });
      setTypeName("");
      setTypeAmount("");
      setHint("Payment type created.");
      setTypes(await listPaymentTypes(council));
      toast("Payment type created", "The type is ready for Record Payment.", "success");
    } catch (error) {
      console.error("[payment-record] Create type failed:", error);
      setHint("Couldn't create the payment type. Check your session and rules.");
    } finally {
      setBusy(false);
    }
  };

  const toggleLock = async (row) => {
    const key = row.key;
    setLocking(key);

    try {
      await setChargeLock({
        council,
        studentId: row.studentId,
        chargeId: row.charge.id,
        index: row.index,
        locked: !row.charge.locked,
      });
      await load();
      toast(
        row.charge.locked ? "Payment unlocked" : "Payment locked",
        row.charge.locked
          ? "The charge is editable again."
          : "The charge is now frozen.",
        "success"
      );
    } catch (error) {
      console.error("[payment-record] Lock failed:", error);
      toast("Couldn't update the charge", "Check your session and Firestore rules.", "error");
    } finally {
      setLocking("");
    }
  };

  return (
    <section className="dash-view payment-record" aria-label="Payment record">
      <form className="pay-create" onSubmit={handleCreateType} noValidate>
        <label htmlFor="payment-type-name">
          Payment Type
          <input
            id="payment-type-name"
            type="text"
            value={typeName}
            onChange={(event) => setTypeName(event.target.value)}
            placeholder="MEMBERSHIP FEE"
            required
          />
        </label>
        <label htmlFor="payment-type-amount">
          Amount
          <input
            id="payment-type-amount"
            type="number"
            min="0"
            step="0.01"
            value={typeAmount}
            onChange={(event) => setTypeAmount(event.target.value)}
            placeholder="0.00"
            required
          />
        </label>
        <button className="btn btn--primary btn--sm" type="submit" disabled={busy}>
          {busy ? "Creating…" : "Create Payment Type"}
        </button>
        {hint ? (
          <p className="pay-form__hint" role="status">
            {hint}
          </p>
        ) : null}
      </form>

      <div className="accounts-table-wrap">
        {status === "loading" ? (
          <div className="accounts-empty">
            <p>Loading payment records…</p>
          </div>
        ) : null}

        {status === "error" ? (
          <div className="accounts-empty">
            <p>Couldn't load the payment records.</p>
            <button className="link-quiet" type="button" onClick={load}>
              Try again
            </button>
          </div>
        ) : null}

        {status === "ready" && !rows.length ? (
          <div className="accounts-empty">
            <p>No payment records yet.</p>
            <small>
              Create a payment type above, then use Record Payment on a student.
            </small>
          </div>
        ) : null}

        {status === "ready" && rows.length ? (
          <div className="accounts-table-scroll">
            <table className="accounts-table payments-table">
              <thead>
                <tr>
                  <th scope="col">Student ID</th>
                  <th scope="col">Full Name</th>
                  <th scope="col">Payment Type</th>
                  <th scope="col" className="num">
                    Amount
                  </th>
                  <th scope="col">Status</th>
                  <th scope="col">Recorded By</th>
                  <th scope="col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.key}>
                    <td>{row.studentId}</td>
                    <td className="cell-name">{row.name}</td>
                    <td>{row.charge.typeLabel || row.charge.label || "Payment"}</td>
                    <td className="num">{money(row.charge.amount)}</td>
                    <td>
                      <span
                        className={`pay-status ${
                          row.charge.locked ? "pay-status--due" : "pay-status--paid"
                        }`}
                      >
                        {row.charge.locked ? "Locked" : "Unlocked"}
                      </span>
                    </td>
                    <td>{row.recordedBy || "—"}</td>
                    <td className="cell-actions">
                      <button
                        className={`row-action${
                          row.charge.locked ? "" : " row-action--danger"
                        }`}
                        type="button"
                        onClick={() => toggleLock(row)}
                        disabled={locking === row.key}
                      >
                        {row.charge.locked ? "Unlock Payment" : "Lock Payment"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </section>
  );
}
