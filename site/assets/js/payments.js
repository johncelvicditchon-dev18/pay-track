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

  var dialog = document.getElementById("payment-dialog");
  var form = document.getElementById("payment-form");
  var dialogClose = document.getElementById("payment-dialog-close");
  var cancelButton = document.getElementById("payment-cancel");
  var errorEl = document.getElementById("payment-error");
  var studentEl = document.getElementById("payment-student");
  var amountInput = document.getElementById("payment-amount");
  var dateInput = document.getElementById("payment-date");
  var refInput = document.getElementById("payment-ref");
  var methodInput = document.getElementById("payment-method");

  var records = [];
  var activeRecord = null;

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

  function render(loaded) {
    records = loaded || [];
    var rows = records
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

  function setError(message) {
    if (!errorEl) return;
    errorEl.textContent = message || "";
    errorEl.hidden = !message;
  }

  function closeDialog() {
    if (!dialog) return;
    if (typeof dialog.close === "function") dialog.close();
    else dialog.removeAttribute("open");
    activeRecord = null;
  }

  function openDialog(record) {
    if (!dialog || !record) return;

    activeRecord = record;
    var summary = summarize(record);

    if (studentEl) {
      studentEl.textContent =
        (record.name || "Student") +
        " · " +
        record.studentId +
        " · Balance " +
        money(summary.balance);
    }

    if (amountInput) {
      amountInput.value =
        summary.balance > 0 ? summary.balance.toFixed(2) : "";
    }
    if (dateInput) {
      dateInput.value = new Date().toISOString().slice(0, 10);
    }
    if (refInput) refInput.value = "";
    if (methodInput) methodInput.value = "Cash · Finance Office";

    setError("");
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "open");

    window.setTimeout(function () {
      if (amountInput) {
        amountInput.focus();
        if (amountInput.select) amountInput.select();
      }
    }, 60);
  }

  function recordFor(studentId) {
    var id = api.normalizeStudentId(studentId);
    return (
      records.filter(function (record) {
        return api.normalizeStudentId(record.studentId) === id;
      })[0] || null
    );
  }

  // Used by the Students table's "Record Payment" action.
  window.TCGCStartPayment = function (studentId, name) {
    if (!COUNCIL) return;

    var existing = recordFor(studentId);
    if (existing) {
      openDialog(existing);
      return;
    }

    if (!window.TCGCFirebase || !window.TCGCFirebase.findPaymentRecord) {
      return;
    }

    window.TCGCFirebase.findPaymentRecord(studentId, COUNCIL)
      .then(function (found) {
        if (!found) {
          if (found === null) {
            api.toast(
              "No charges yet",
              "Add a charge for " +
                (name || "this student") +
                " before recording a payment.",
              "info"
            );
          }
          return;
        }
        if (!found.name && name) found.name = name;
        openDialog(found);
      })
      .catch(function (error) {
        console.warn("[payments] Could not load the student's record:", error);
        api.toast(
          "Couldn't open the payment form",
          "Check your connection and Firestore rules.",
          "error"
        );
      });
  };

  if (body) {
    body.addEventListener("click", function (event) {
      var button =
        event.target && event.target.closest
          ? event.target.closest("[data-record-payment]")
          : null;
      if (!button) return;
      var record = recordFor(button.getAttribute("data-record-payment"));
      if (record) openDialog(record);
    });
  }

  if (form) {
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      if (!activeRecord) return;

      var amount = Number(amountInput.value);
      var date = dateInput.value;
      var ref = refInput.value.trim();
      var method = methodInput.value.trim();

      if (!(amount > 0)) {
        setError("Enter an amount greater than zero.");
        if (amountInput) amountInput.focus();
        return;
      }
      if (!date) {
        setError("Select the payment date.");
        if (dateInput) dateInput.focus();
        return;
      }
      if (!ref) {
        setError("Enter the OR or reference number.");
        if (refInput) refInput.focus();
        return;
      }

      var submit = form.querySelector('button[type="submit"]');
      if (submit) submit.disabled = true;
      var studentName = activeRecord.name || "the student";
      var studentId = activeRecord.studentId;

      window.TCGCFirebase.recordPayment({
        council: COUNCIL,
        studentId: studentId,
        amount: amount,
        date: date,
        ref: ref,
        method: method
      })
        .then(function () {
          closeDialog();
          if (api.toast) {
            api.toast(
              "Payment recorded",
              money(amount) + " recorded for " + studentName + ".",
              "success"
            );
          }
          load();
        })
        .catch(function (error) {
          console.warn("[payments] Record payment failed:", error);
          setError(
            "Couldn't save the payment. Check your session and Firestore rules, then try again."
          );
        })
        .then(function () {
          if (submit) submit.disabled = false;
        });
    });
  }

  if (dialogClose) dialogClose.addEventListener("click", closeDialog);
  if (cancelButton) cancelButton.addEventListener("click", closeDialog);
  if (dialog) {
    dialog.addEventListener("click", function (event) {
      if (event.target === dialog) closeDialog();
    });
    dialog.addEventListener("close", function () {
      activeRecord = null;
    });
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
