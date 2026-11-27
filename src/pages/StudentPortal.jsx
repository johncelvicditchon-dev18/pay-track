import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { fetchStudentPayments } from "../lib/paymentRecords";
import "../styles/student.css";

const SEMESTER_ORDER = ["1ST SEMESTER", "2ND SEMESTER", "SUMMER"];

function money(value) {
  return `₱${Number(value || 0).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function groupCharges(charges) {
  const groups = {};

  charges.forEach((charge) => {
    const semester = String(charge.semester || "").trim();
    const year = String(charge.academicYear || "").trim();
    const key = `${semester || "UNASSIGNED"}||${year}`;

    if (!groups[key]) {
      groups[key] = {
        key,
        semester: semester || "Unassigned semester",
        year,
        charges: [],
      };
    }

    groups[key].charges.push(charge);
  });

  return Object.values(groups).sort((a, b) => {
    const ai = SEMESTER_ORDER.indexOf(a.semester.toUpperCase());
    const bi = SEMESTER_ORDER.indexOf(b.semester.toUpperCase());
    if (a.year !== b.year) return String(b.year).localeCompare(String(a.year));
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });
}

export default function StudentPortal() {
  const [params, setParams] = useSearchParams();
  const queryId = (params.get("studentId") || "").trim().toUpperCase();
  const [input, setInput] = useState(queryId);
  const [studentId, setStudentId] = useState(queryId);
  const [records, setRecords] = useState([]);
  const [status, setStatus] = useState(queryId ? "loading" : "idle");
  const [error, setError] = useState("");

  useEffect(() => {
    setInput(queryId);
    setStudentId(queryId);
  }, [queryId]);

  useEffect(() => {
    if (!studentId) {
      setRecords([]);
      setStatus("idle");
      return undefined;
    }

    let active = true;
    setStatus("loading");
    setError("");

    fetchStudentPayments(studentId)
      .then((rows) => {
        if (!active) return;
        setRecords(rows);
        setStatus("ready");
      })
      .catch((lookupError) => {
        if (!active) return;
        console.error("[student] Payment lookup failed:", lookupError);
        setStatus("error");
        setError("We couldn't load your payments. Check your connection and try again.");
      });

    return () => {
      active = false;
    };
  }, [studentId]);

  const summary = useMemo(() => {
    const charges = records.flatMap((record) =>
      (record.charges || []).map((charge) => ({
        ...charge,
        amount: Number(charge.amount || 0),
        paid: Number(charge.paid || 0),
      }))
    );
    const receipts = records.flatMap((record) => record.payments || []);
    const total = charges.reduce((sum, charge) => sum + charge.amount, 0);
    const paid = charges.reduce((sum, charge) => sum + charge.paid, 0);

    return {
      charges,
      receipts,
      total,
      paid,
      balance: Math.max(total - paid, 0),
      name: records.find((record) => record.name)?.name || studentId,
      council: records.find((record) => record.council)?.council || "",
      updated: records.find((record) => record.updated)?.updated || "",
    };
  }, [records, studentId]);

  const groups = useMemo(() => groupCharges(summary.charges), [summary.charges]);

  const handleSubmit = (event) => {
    event.preventDefault();
    const id = input.trim().toUpperCase();

    if (!id) {
      setError("Enter your Student ID.");
      return;
    }

    setError("");
    setParams(id === queryId ? {} : { studentId: id });
    setStudentId(id);
  };

  return (
    <div className="student-page">
      <header className="site-header is-scrolled">
        <div className="container header-inner">
          <Link className="brand" to="/" aria-label="TCGC PayTrack home">
            <img
              className="brand-logo"
              src="/logo/logo-toggle.png"
              alt="Tangub City Global College logo"
            />
            <span className="brand-text">
              <strong>TCGC PayTrack</strong>
              <span>Student portal</span>
            </span>
          </Link>
          <div className="header-actions">
            <Link className="header-login" to="/login">
              Officer login
            </Link>
          </div>
        </div>
      </header>

      <main className="container student-main">
        <section className="student-gate" hidden={status === "loading" || status === "ready"}>
          <span className="eyebrow">Student portal</span>
          <h1>Track your payments</h1>
          <p>
            Enter your Student ID to see your balances grouped by semester and
            payment type.
          </p>

          <form className="student-id-form" onSubmit={handleSubmit} noValidate>
            <label htmlFor="student-id-input">Student ID</label>
            <div className="student-id-row">
              <input
                id="student-id-input"
                type="text"
                value={input}
                onChange={(event) => {
                  setInput(event.target.value);
                  if (error) setError("");
                }}
                placeholder="Enter your Student ID"
                autoComplete="username"
                autoCapitalize="characters"
                spellCheck="false"
                required
              />
              <button className="btn btn--primary" type="submit">
                View payments
              </button>
            </div>
            {error ? (
              <p className="field-error" role="alert">
                {error}
              </p>
            ) : null}
          </form>

          <p className="student-hint">
            Your record comes from the Finance Office. Contact them if a payment
            or receipt is missing.
          </p>
        </section>

        {status === "loading" ? (
          <div className="student-empty">
            <p>Checking your payment record…</p>
          </div>
        ) : null}

        {status === "error" ? (
          <div className="student-empty">
            <p>{error}</p>
            <button
              className="btn btn--outline"
              type="button"
              onClick={() => setStudentId("")}
            >
              Try another ID
            </button>
          </div>
        ) : null}

        {status === "ready" && !summary.charges.length ? (
          <div className="student-empty">
            <p>No payment record found for {studentId}.</p>
            <small>
              Check the Student ID, or contact the Finance Office if your
              assessment has not been posted.
            </small>
            <button
              className="btn btn--outline"
              type="button"
              onClick={() => {
                setParams({});
                setStudentId("");
                setRecords([]);
              }}
            >
              Try another ID
            </button>
          </div>
        ) : null}

        {status === "ready" && summary.charges.length ? (
          <section className="student-dashboard">
            <div className="student-head">
              <div>
                <span className="eyebrow">Student portal</span>
                <h1>{summary.name}</h1>
                <p>
                  {studentId}
                  {summary.council ? ` · ${summary.council}` : ""}
                </p>
              </div>
              <button
                className="btn btn--outline btn--sm"
                type="button"
                onClick={() => {
                  setParams({});
                  setStudentId("");
                  setRecords([]);
                }}
              >
                Change Student ID
              </button>
            </div>

            <div className="student-stats">
              <article className="student-stat">
                <span>Total billed</span>
                <strong>{money(summary.total)}</strong>
              </article>
              <article className="student-stat">
                <span>Total paid</span>
                <strong>{money(summary.paid)}</strong>
              </article>
              <article className="student-stat student-stat--accent">
                <span>Balance</span>
                <strong>{money(summary.balance)}</strong>
              </article>
            </div>

            {groups.map((group) => {
              const groupPaid = group.charges.reduce(
                (sum, charge) => sum + Number(charge.paid || 0),
                0
              );
              const groupTotal = group.charges.reduce(
                (sum, charge) => sum + Number(charge.amount || 0),
                0
              );

              return (
                <article className="student-semester" key={group.key}>
                  <header className="student-semester__head">
                    <div>
                      <h2>
                        {group.semester}
                        {group.year ? ` · ${group.year}` : ""}
                      </h2>
                      <p>
                        {group.charges.length}{" "}
                        {group.charges.length === 1
                          ? "payment type"
                          : "payment types"}
                      </p>
                    </div>
                    <span className="student-semester__total">
                      {money(groupTotal - groupPaid)} balance
                    </span>
                  </header>

                  {group.charges.map((charge, index) => {
                    const remaining = Math.max(
                      Number(charge.amount || 0) - Number(charge.paid || 0),
                      0
                    );
                    const statusLabel = charge.locked
                      ? "Locked"
                      : remaining <= 0
                      ? "Paid"
                      : Number(charge.paid || 0) > 0
                      ? "Partial"
                      : "Unpaid";

                    return (
                      <div
                        className="student-type"
                        key={`${charge.typeLabel || charge.label}-${index}`}
                      >
                        <div className="student-type__maintop">
                          <strong>
                            {charge.typeLabel || charge.label || "Payment"}
                          </strong>
                          <small>
                            {charge.label || charge.typeLabel}
                            {charge.dueDate ? ` · Due ${charge.dueDate}` : ""} ·{" "}
                            {statusLabel}
                          </small>
                        </div>
                        <div className="student-type__amounts">
                          <b>{money(charge.amount)}</b>
                          <span>Paid {money(charge.paid)}</span>
                          <span className={remaining > 0 ? "is-due" : ""}>
                            Balance {money(remaining)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </article>
              );
            })}

            {summary.receipts.length ? (
              <section className="student-receipts">
                <h2>Official receipts</h2>
                <ul>
                  {summary.receipts.map((receipt, index) => (
                    <li key={`${receipt.ref}-${index}`}>
                      <span>
                        <b>{receipt.label || "Payment"}</b>
                        <br />
                        <small>
                          {receipt.date || "—"}
                          {receipt.method ? ` · ${receipt.method}` : ""}
                          {receipt.recordedBy
                            ? ` · Assisted by ${receipt.recordedBy}`
                            : ""}
                        </small>
                      </span>
                      <span>
                        <b>{money(receipt.amount)}</b>
                        <br />
                        <small>{receipt.ref || "—"}</small>
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {summary.updated ? (
              <p className="student-updated">
                Balances updated {summary.updated}. Questions? Contact the
                Finance Office.
              </p>
            ) : null}
          </section>
        ) : null}
      </main>
    </div>
  );
}
