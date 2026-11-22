import { useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { findUserByStudentId, initials } from "../lib/auth";
import { DEMO_RECORDS } from "../data/paymentRecords";

const ID_RE = /^[A-Za-z0-9][A-Za-z0-9-]{3,14}$/;

function money(value) {
  return `₱${Number(value || 0).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function iconProps() {
  return {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": "true",
  };
}

function TrackRecord({ record, studentId }) {
  const percent = record.total > 0 ? Math.round((record.paid / record.total) * 100) : 0;
  const isPaid = record.balance <= 0;

  return (
    <div className="track-view">
      <div className="track-head">
        <span className="eyebrow">Institute payment record</span>
        <div className="track-head__person">
          <span className="track-avatar">{initials(record.name)}</span>
          <div>
            <h2 id="track-dialog-title">{record.name}</h2>
            <p className="track-head__meta">
              {studentId} · {record.institute} · {record.program} · {record.yearLevel}
            </p>
          </div>
        </div>
      </div>

      <div className="track-balance">
        <div className="track-balance__row">
          <span>Outstanding balance</span>
          <span>{percent}% paid</span>
        </div>
        <p className="track-balance__amount">{money(record.balance)}</p>
        <div className="track-bar">
          <span style={{ width: `${percent}%` }} />
        </div>
        <div className="track-balance__foot">
          <span>Paid {money(record.paid)}</span>
          <span>Total {money(record.total)}</span>
        </div>
      </div>

      <dl className="track-meta">
        <div>
          <dt>Status</dt>
          <dd>
            <span className={`track-tag ${isPaid ? "track-tag--paid" : "track-tag--due"}`}>
              {isPaid ? "Fully paid" : "With balance"}
            </span>
          </dd>
        </div>
        <div>
          <dt>Next due</dt>
          <dd>{record.nextDue}</dd>
        </div>
      </dl>

      <h3 className="track-section-title">Recent payments</h3>
      <ul className="track-payments">
        {record.payments.map((payment) => (
          <li key={`${payment.ref}-${payment.date}`}>
            <span className="track-payment__icon">
              <svg {...iconProps()}>
                <path d="M20 6 9 17l-5-5" />
              </svg>
            </span>
            <div>
              <strong>{payment.label}</strong>
              <small>
                {payment.date} · Ref #{payment.ref}
              </small>
            </div>
            <span className="track-amount">{money(payment.amount)}</span>
          </li>
        ))}
      </ul>

      <p className="track-note">
        Questions or corrections? Contact the Finance Office at{" "}
        <a href="mailto:finance@tcgc.edu.ph">finance@tcgc.edu.ph</a>.
      </p>
    </div>
  );
}

function RegisteredPreview({ account, studentId, onClose }) {
  return (
    <div className="track-empty">
      <span className="track-empty__icon">
        <svg {...iconProps()}>
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21a8 8 0 0 1 16 0" />
        </svg>
      </span>
      <span className="eyebrow">Account found</span>
      <h2 id="track-dialog-title">No assessment posted yet</h2>
      <p>
        <strong>{account.name}</strong> ({studentId}) is registered under{" "}
        <strong>
          {account.institute || "—"} · {account.program || "—"}
        </strong>
        {account.yearLevel ? ` · ${account.yearLevel}` : ""}. Your payment
        assessment has not been posted yet. Check back after enrollment or visit
        the Finance Office.
      </p>
      <button className="btn btn--primary" type="button" onClick={onClose}>
        Close
      </button>
    </div>
  );
}

function NotFound({ studentId, onRetry }) {
  return (
    <div className="track-empty">
      <span className="track-empty__icon">
        <svg {...iconProps()}>
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.6-3.6" />
        </svg>
      </span>
      <span className="eyebrow">No record found</span>
      <h2 id="track-dialog-title">We couldn&apos;t find that ID</h2>
      <p>
        No payment record matches <strong>{studentId}</strong>. Check the student
        ID on your school ID card, or contact the Finance Office for help.
      </p>
      <button className="btn btn--primary" type="button" onClick={onRetry}>
        Try another ID
      </button>
      <p className="track-empty__hint">
        Demo IDs: 2024-00123 · 2023-00456 · 2025-00789
      </p>
    </div>
  );
}

export default function PaymentTracker() {
  const { user } = useAuth();
  const [studentId, setStudentId] = useState(user?.studentId || "");
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const inputRef = useRef(null);
  const dialogRef = useRef(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return undefined;

    const handleClose = () => document.body.classList.remove("track-open");
    dialog.addEventListener("close", handleClose);
    return () => {
      dialog.removeEventListener("close", handleClose);
      document.body.classList.remove("track-open");
    };
  }, []);

  const openDialog = () => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    document.body.classList.add("track-open");
    if (!dialog.open) dialog.showModal();
  };

  const showRecord = (id) => {
    const normalized = id.trim().toUpperCase();

    if (DEMO_RECORDS[normalized]) {
      setResult({
        type: "record",
        studentId: normalized,
        record: DEMO_RECORDS[normalized],
      });
      openDialog();
      return;
    }

    const registered = findUserByStudentId(normalized);
    if (registered) {
      setResult({ type: "registered", studentId: normalized, account: registered });
      openDialog();
      return;
    }

    setResult({ type: "missing", studentId: normalized });
    openDialog();
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const id = studentId.trim();

    if (!id) {
      setError("Enter your Student ID to track your payment.");
      inputRef.current?.focus();
      return;
    }

    if (!ID_RE.test(id)) {
      setError("Enter a valid Student ID (for example 2024-00123).");
      inputRef.current?.focus();
      return;
    }

    setError("");
    showRecord(id);
  };

  const handleDemo = (id) => {
    setStudentId(id);
    setError("");
    showRecord(id);
  };

  const closeDialog = () => {
    dialogRef.current?.close();
  };

  const retryDialog = () => {
    dialogRef.current?.close();
    window.setTimeout(() => inputRef.current?.focus(), 150);
  };

  return (
    <>
      <form className={`hero-track${error ? " has-error" : ""}`} onSubmit={handleSubmit} noValidate>
        <label className="hero-track__label" htmlFor="track-student-id">
          <svg {...iconProps()}>
            <rect x="3" y="5" width="18" height="14" rx="2" />
            <path d="M7 9h4M7 13h7M15 9h2" />
          </svg>
          Track your payment
        </label>

        <div className="hero-track__row">
          <input
            ref={inputRef}
            className="hero-track__input"
            type="text"
            id="track-student-id"
            name="studentId"
            value={studentId}
            onChange={(event) => {
              setStudentId(event.target.value);
              if (error) setError("");
            }}
            placeholder="Enter your Student ID"
            autoComplete="off"
            spellCheck="false"
            aria-invalid={error ? "true" : "false"}
            aria-describedby="track-hint track-error"
            required
          />
          <button className="btn btn--accent hero-track__btn" type="submit">
            Track
            <svg {...iconProps()}>
              <path d="m21 21-4.3-4.3M10.5 18a7.5 7.5 0 1 0 0-15 7.5 7.5 0 0 0 0 15Z" />
            </svg>
          </button>
        </div>

        <p className="hero-track__hint" id="track-hint">
          Try demo ID{" "}
          <button
            className="hero-track__demo"
            type="button"
            onClick={() => handleDemo("2024-00123")}
          >
            2024-00123
          </button>
        </p>

        {error ? (
          <p className="hero-track__error" id="track-error" role="alert">
            {error}
          </p>
        ) : null}
      </form>

      <dialog
        className="track-dialog"
        id="track-dialog"
        ref={dialogRef}
        aria-labelledby="track-dialog-title"
        onClick={(event) => {
          if (event.target === event.currentTarget) closeDialog();
        }}
      >
        <button
          className="track-dialog__close"
          id="track-close"
          type="button"
          aria-label="Close payment summary"
          onClick={closeDialog}
        >
          <svg {...iconProps()}>
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>

        <div className="track-dialog__body">
          {result?.type === "record" ? (
            <TrackRecord record={result.record} studentId={result.studentId} />
          ) : null}

          {result?.type === "registered" ? (
            <RegisteredPreview
              account={result.account}
              studentId={result.studentId}
              onClose={closeDialog}
            />
          ) : null}

          {result?.type === "missing" ? (
            <NotFound studentId={result.studentId} onRetry={retryDialog} />
          ) : null}
        </div>
      </dialog>
    </>
  );
}
