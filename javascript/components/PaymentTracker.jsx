import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { findUserByStudentId, initials } from "../lib/auth";
import { fetchPaymentRecord, summarizeRecord } from "../lib/paymentRecords";

const ID_RE = /^[A-Za-z0-9][A-Za-z0-9-]{3,14}$/;

function money(value) {
  return `₱${Number(value || 0).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function slug(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-");
}

function chargeStatus(charge) {
  if (charge.balance <= 0) return { label: "Paid", tone: "paid" };
  if (charge.paid > 0) return { label: "Partial", tone: "partial" };
  return { label: "Unpaid", tone: "due" };
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
  const summary = summarizeRecord(record);
  const isPaid = summary.balance <= 0;
  const openCharges = summary.charges.filter((charge) => charge.balance > 0).length;

  return (
    <div className="track-view">
      <div className="track-head">
        <span className="eyebrow">Payment record</span>
        <div className="track-head__person">
          <span className="track-avatar">{initials(record.name)}</span>
          <div>
            <h2 id="track-dialog-title">{record.name}</h2>
            <p className="track-head__meta">
              {studentId} · {record.program || "—"} · {record.yearLevel || "—"}
            </p>
          </div>
        </div>
        <div className="track-chips">
          {record.council ? (
            <span className="track-chip track-chip--org">{record.council}</span>
          ) : null}
          {record.institute ? (
            <span className="track-chip">Institute · {record.institute}</span>
          ) : null}
          {record.organization ? (
            <span className="track-chip track-chip--org">
              Organization · {record.organization}
            </span>
          ) : null}
          {record.statement ? (
            <span className="track-chip track-chip--muted">{record.statement}</span>
          ) : null}
        </div>
      </div>

      <div className="track-balance">
        <div className="track-balance__row">
          <span>Outstanding balance</span>
          <span>{summary.percent}% paid</span>
        </div>
        <p className="track-balance__amount">{money(summary.balance)}</p>
        <div className="track-bar">
          <span style={{ width: `${summary.percent}%` }} />
        </div>
        <div className="track-balance__foot">
          <span>Paid {money(summary.paid)}</span>
          <span>Total {money(summary.total)}</span>
        </div>
      </div>

      <div className="track-scopes">
        {summary.scopes.map((scope) => (
          <div className="track-scope" key={scope.scope}>
            <div className="track-scope__head">
              <span className="track-scope__label">{scope.scope}</span>
              <span className="track-scope__count">
                {scope.count} {scope.count === 1 ? "charge" : "charges"}
              </span>
            </div>
            <strong className="track-scope__unit">{scope.unit}</strong>
            <div className="track-scope__row">
              <span>Charged</span>
              <span>{money(scope.total)}</span>
            </div>
            <div className="track-scope__row">
              <span>Paid</span>
              <span>{money(scope.paid)}</span>
            </div>
            <div
              className={`track-scope__row track-scope__row--balance ${
                scope.balance > 0 ? "is-due" : "is-clear"
              }`}
            >
              <span>Balance</span>
              <span>{money(scope.balance)}</span>
            </div>
          </div>
        ))}
      </div>

      <dl className="track-meta">
        <div>
          <dt>Status</dt>
          <dd>
            <span className={`track-tag ${isPaid ? "track-tag--paid" : "track-tag--due"}`}>
              {isPaid ? "Fully paid" : `${openCharges} charge${openCharges === 1 ? "" : "s"} open`}
            </span>
          </dd>
        </div>
        <div>
          <dt>Next due</dt>
          <dd>{record.nextDue}</dd>
        </div>
      </dl>

      <div className="track-section-head">
        <h3 className="track-section-title">All charges</h3>
        <span className="track-section-note">
          {openCharges} with balance · {summary.charges.length} total
        </span>
      </div>
      <ul className="track-charges">
        {summary.charges.map((charge) => {
          const status = chargeStatus(charge);
          return (
            <li className="track-charge" key={charge.id}>
              <div className="track-charge__top">
                <span className={`track-cat track-cat--${slug(charge.category)}`}>
                  {charge.category}
                </span>
                <div className="track-charge__title">
                  <strong>{charge.label}</strong>
                  <small>
                    {charge.scope} · {charge.unit} · Due {charge.dueDate}
                  </small>
                </div>
                <span className={`track-tag track-tag--${status.tone}`}>{status.label}</span>
              </div>
              <div className="track-charge__money">
                <span>
                  Amount <b>{money(charge.amount)}</b>
                </span>
                <span>
                  Paid <b>{money(charge.paid)}</b>
                </span>
                <span className={charge.balance > 0 ? "is-due" : "is-clear"}>
                  Balance <b>{money(charge.balance)}</b>
                </span>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="track-section-head">
        <h3 className="track-section-title">Payments &amp; official receipts</h3>
        <span className="track-section-note">{record.payments.length} receipts</span>
      </div>
      <ul className="track-payments">
        {record.payments.map((payment) => (
          <li key={payment.id}>
            <span className="track-payment__icon">
              <svg {...iconProps()}>
                <path d="M20 6 9 17l-5-5" />
              </svg>
            </span>
            <div className="track-payment__body">
              <strong>{payment.label}</strong>
              <small>
                {payment.date} · {payment.method}
              </small>
            </div>
            <span className="track-receipt">
              <span className="track-amount">{money(payment.amount)}</span>
              <span className="track-ref">
                {payment.ref} · {payment.status}
              </span>
            </span>
          </li>
        ))}
      </ul>

      <p className="track-note">
        Balances updated {record.updated}. Questions or corrections? Contact the
        Finance Office at <a href="mailto:finance@tcgc.edu.ph">finance@tcgc.edu.ph</a>.
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
        <strong>{account.council || "—"}</strong>
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
        Log in with your Student ID to check your latest balance and receipts.
      </p>
    </div>
  );
}

function SignInRequired({ studentId, onClose }) {
  return (
    <div className="track-empty">
      <span className="track-empty__icon">
        <svg {...iconProps()}>
          <rect x="4" y="10" width="16" height="10" rx="2" />
          <path d="M8 10V7a4 4 0 0 1 8 0v3" />
        </svg>
      </span>
      <span className="eyebrow">Sign in required</span>
      <h2 id="track-dialog-title">Log in to view your record</h2>
      <p>
        Payment records are private. Sign in with <strong>{studentId}</strong> and
        your password to see your balances, charges, and official receipts.
      </p>
      <div className="track-empty__actions">
        <Link className="btn btn--primary" to="/login" onClick={onClose}>
          Go to log in
        </Link>
        <button className="btn btn--outline" type="button" onClick={onClose}>
          Cancel
        </button>
      </div>
    </div>
  );
}

export default function PaymentTracker() {
  const { user, authReady } = useAuth();
  const [studentId, setStudentId] = useState(user?.studentId || "");
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [checking, setChecking] = useState(false);
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

  const showRecord = async (id) => {
    const normalized = id.trim().toUpperCase();

    if (!authReady) {
      setError("One moment — we're still checking your session. Try again.");
      return;
    }

    if (!user) {
      setResult({ type: "signin", studentId: normalized });
      openDialog();
      return;
    }

    if (!user.council) {
      setError(
        "Your account has no Council/Organization assigned yet. Contact the Finance Office."
      );
      return;
    }

    const record = await fetchPaymentRecord(normalized, user.council);
    if (record) {
      setResult({ type: "record", studentId: normalized, record });
      openDialog();
      return;
    }

    const registered = await findUserByStudentId(normalized);
    if (registered) {
      setResult({ type: "registered", studentId: normalized, account: registered });
      openDialog();
      return;
    }

    setResult({ type: "missing", studentId: normalized });
    openDialog();
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const id = studentId.trim();

    if (!id) {
      setError("Enter your Student ID to track your payment.");
      inputRef.current?.focus();
      return;
    }

    if (!ID_RE.test(id)) {
      setError("Enter a valid Student ID.");
      inputRef.current?.focus();
      return;
    }

    setError("");
    setChecking(true);

    try {
      await showRecord(id);
    } catch (lookupError) {
      console.error("[tracker] Student ID lookup failed:", lookupError);
      setError(
        "We couldn't check that Student ID right now. Please try again in a moment."
      );
    } finally {
      setChecking(false);
    }
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
          Track your payments
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
            aria-describedby="track-error"
            required
          />
          <button
            className="btn btn--accent hero-track__btn"
            type="submit"
            disabled={checking}
          >
            {checking ? "Checking…" : "Track"}
            <svg {...iconProps()}>
              <path d="m21 21-4.3-4.3M10.5 18a7.5 7.5 0 1 0 0-15 7.5 7.5 0 0 0 0 15Z" />
            </svg>
          </button>
        </div>

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

          {result?.type === "signin" ? (
            <SignInRequired studentId={result.studentId} onClose={closeDialog} />
          ) : null}
        </div>
      </dialog>
    </>
  );
}
