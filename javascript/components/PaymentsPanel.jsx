import { useEffect, useMemo, useState } from "react";
import { normalizeCouncil } from "../data/councils";
import { listPaymentRecords, summarizeRecord } from "../lib/paymentRecords";

function money(value) {
  return `₱${Number(value || 0).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function display(value) {
  const text = String(value == null ? "" : value).trim();
  return text || "—";
}

export default function PaymentsPanel({ council }) {
  const activeCouncil = normalizeCouncil(council);
  const [records, setRecords] = useState([]);
  const [status, setStatus] = useState(activeCouncil ? "loading" : "no-council");

  useEffect(() => {
    let active = true;

    if (!activeCouncil) {
      setRecords([]);
      setStatus("no-council");
      return () => {
        active = false;
      };
    }

    setStatus("loading");
    listPaymentRecords(activeCouncil)
      .then((rows) => {
        if (!active) return;
        setRecords(rows);
        setStatus("ready");
      })
      .catch((error) => {
        if (!active) return;
        console.warn("[payments] Could not load payment records:", error);
        setRecords([]);
        setStatus("error");
      });

    return () => {
      active = false;
    };
  }, [activeCouncil]);

  const rows = useMemo(
    () =>
      records
        .map((record) => ({ record, summary: summarizeRecord(record) }))
        .sort((a, b) =>
          String(a.record.name || "").localeCompare(String(b.record.name || ""))
        ),
    [records]
  );

  const totals = useMemo(
    () =>
      rows.reduce(
        (acc, row) => ({
          billed: acc.billed + row.summary.total,
          paid: acc.paid + row.summary.paid,
          balance: acc.balance + row.summary.balance,
          open: acc.open + (row.summary.balance > 0 ? 1 : 0),
        }),
        { billed: 0, paid: 0, balance: 0, open: 0 }
      ),
    [rows]
  );

  return (
    <section className="dash-view payments-view" aria-label="Payments">
      <div className="view-head">
        <div>
          <h1>Payments</h1>
          <p className="view-subtitle">
            Charge balances and receipts{activeCouncil ? ` · ${activeCouncil}` : ""}
          </p>
        </div>
        <span className="dash-count">
          {status === "ready"
            ? `${rows.length} ${rows.length === 1 ? "record" : "records"}`
            : status === "loading"
            ? "Loading…"
            : "—"}
        </span>
      </div>

      <div className="stat-grid">
        <article className="stat-card">
          <span className="stat-card__label">Total billed</span>
          <strong>{money(totals.billed)}</strong>
          <small>All charges in this council</small>
        </article>
        <article className="stat-card">
          <span className="stat-card__label">Total paid</span>
          <strong>{money(totals.paid)}</strong>
          <small>Verified payments</small>
        </article>
        <article className="stat-card stat-card--accent">
          <span className="stat-card__label">Outstanding</span>
          <strong>{money(totals.balance)}</strong>
          <small>{totals.open} with an open balance</small>
        </article>
      </div>

      <div className="accounts-table-wrap">
        {status === "loading" ? (
          <div className="accounts-empty" aria-live="polite">
            <p>
              <span className="spinner" /> Loading payment records…
            </p>
          </div>
        ) : null}

        {status === "error" ? (
          <div className="accounts-empty">
            <p>
              We couldn't load the payment records right now. Check your
              connection and try again.
            </p>
          </div>
        ) : null}

        {status === "no-council" ? (
          <div className="accounts-empty">
            <p>No Council/Organization assigned.</p>
            <small>
              Contact the Finance Office to assign your council or organization.
            </small>
          </div>
        ) : null}

        {status === "ready" && rows.length ? (
          <div className="accounts-table-scroll">
            <table className="accounts-table payments-table">
              <thead>
                <tr>
                  <th scope="col">Student</th>
                  <th scope="col">Student ID</th>
                  <th scope="col" className="num">
                    Billed
                  </th>
                  <th scope="col" className="num">
                    Paid
                  </th>
                  <th scope="col" className="num">
                    Balance
                  </th>
                  <th scope="col" className="num">
                    Receipts
                  </th>
                  <th scope="col">Next due</th>
                  <th scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ record, summary }) => {
                  const settled = summary.balance <= 0;
                  const openCharges = summary.charges.filter(
                    (charge) => charge.balance > 0
                  ).length;

                  return (
                    <tr key={record.studentId}>
                      <td className="cell-name">{display(record.name)}</td>
                      <td>{display(record.studentId)}</td>
                      <td className="num">{money(summary.total)}</td>
                      <td className="num">{money(summary.paid)}</td>
                      <td className={`num${settled ? "" : " is-due"}`}>
                        {money(summary.balance)}
                      </td>
                      <td className="num">{record.payments.length}</td>
                      <td>{display(record.nextDue)}</td>
                      <td>
                        <span
                          className={`pay-status${
                            settled ? " pay-status--paid" : " pay-status--due"
                          }`}
                        >
                          {settled
                            ? "Fully paid"
                            : `${openCharges} open`}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}

        {status === "ready" && !rows.length ? (
          <div className="accounts-empty">
            <p>No payment records for {activeCouncil} yet.</p>
            <small>
              Add documents to the <code>paymentRecords</code> collection with
              IDs like <code>{activeCouncil}::2024-00123</code>.
            </small>
          </div>
        ) : null}
      </div>
    </section>
  );
}
