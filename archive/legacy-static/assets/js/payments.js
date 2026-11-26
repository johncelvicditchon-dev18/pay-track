/* =========================================================
   TCGC PayTrack — payments tab (council-scoped summary)
   ========================================================= */

(function () {
  "use strict";

  var api = window.TCGC;
  if (!api) return;

  var session = api.getSession ? api.getSession() : null;
  var COUNCIL = session && session.council ? api.normalizeCouncil(session.council) : "";

  var body = document.getElementById("payments-body");
  if (!body) return;

  var tableWrap = document.getElementById("payments-table-wrap");
  var empty = document.getElementById("payments-empty");
  var countEl = document.getElementById("payments-count");
  var billedEl = document.getElementById("payments-billed");
  var paidEl = document.getElementById("payments-paid");
  var balanceEl = document.getElementById("payments-balance");
  var openEl = document.getElementById("payments-open");

  function money(value) {
    return (
      "₱" +
      Number(value || 0).toLocaleString("en-PH", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })
    );
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function text(value) {
    var copy = String(value == null ? "" : value).trim();
    return copy ? escapeHtml(copy) : "—";
  }

  function summarize(record) {
    var charges = Array.isArray(record.charges) ? record.charges : [];
    var total = 0;
    var paid = 0;
    var open = 0;

    charges.forEach(function (charge) {
      var amount = Number(charge.amount || 0);
      var paidAmount = Number(charge.paid || 0);
      total += amount;
      paid += paidAmount;
      if (amount - paidAmount > 0) open += 1;
    });

    return {
      total: total,
      paid: paid,
      balance: Math.max(total - paid, 0),
      open: open,
      receipts: Array.isArray(record.payments) ? record.payments.length : 0
    };
  }

  function render(records) {
    var rows = (records || [])
      .map(function (record) {
        return { record: record, summary: summarize(record) };
      })
      .sort(function (a, b) {
        return String(a.record.name || "").localeCompare(String(b.record.name || ""));
      });

    var totals = rows.reduce(
      function (acc, row) {
        return {
          billed: acc.billed + row.summary.total,
          paid: acc.paid + row.summary.paid,
          balance: acc.balance + row.summary.balance,
          open: acc.open + (row.summary.balance > 0 ? 1 : 0)
        };
      },
      { billed: 0, paid: 0, balance: 0, open: 0 }
    );

    if (billedEl) billedEl.textContent = money(totals.billed);
    if (paidEl) paidEl.textContent = money(totals.paid);
    if (balanceEl) balanceEl.textContent = money(totals.balance);
    if (openEl) openEl.textContent = totals.open + " with an open balance";
    if (countEl) {
      countEl.textContent =
        rows.length + (rows.length === 1 ? " record" : " records");
    }

    if (!rows.length) {
      body.innerHTML = "";
      if (tableWrap) tableWrap.hidden = true;
      if (empty) empty.hidden = false;
      return;
    }

    if (empty) empty.hidden = true;
    if (tableWrap) tableWrap.hidden = false;

    body.innerHTML = rows
      .map(function (row) {
        var record = row.record;
        var summary = row.summary;
        var settled = summary.balance <= 0;

        return (
          "<tr>" +
          '<td class="cell-name">' + text(record.name) + "</td>" +
          "<td>" + text(record.studentId) + "</td>" +
          '<td class="num">' + money(summary.total) + "</td>" +
          '<td class="num">' + money(summary.paid) + "</td>" +
          '<td class="num' + (settled ? "" : " is-due") + '">' +
          money(summary.balance) + "</td>" +
          '<td class="num">' + summary.receipts + "</td>" +
          "<td>" + text(record.nextDue) + "</td>" +
          "<td><span class=\"pay-status " +
          (settled ? "pay-status--paid" : "pay-status--due") +
          '">' +
          (settled ? "Fully paid" : summary.open + " open") +
          "</span></td>" +
          "</tr>"
        );
      })
      .join("");
  }

  function load() {
    if (!COUNCIL) {
      render([]);
      if (empty) {
        empty.hidden = false;
        empty.innerHTML =
          "<p>No Council/Organization assigned.</p>" +
          "<small>Contact the Finance Office to assign your council or organization.</small>";
      }
      return;
    }

    if (!window.TCGCFirebase || !window.TCGCFirebase.available) {
      render([]);
      return;
    }

    if (countEl) countEl.textContent = "Loading…";

    window.TCGCFirebase.loadPayments(COUNCIL)
      .then(render)
      .catch(function (error) {
        console.warn("[payments] Could not load payment records:", error);
        render([]);
        if (empty) {
          empty.hidden = false;
          empty.innerHTML =
            "<p>We couldn't load the payment records right now.</p>" +
            "<small>Check your Firebase rules and connection, then try again.</small>";
        }
      });
  }

  window.TCGCRefreshPayments = load;
  load();
})();
