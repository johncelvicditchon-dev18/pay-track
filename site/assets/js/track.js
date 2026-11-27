/* =========================================================
   TCGC PayTrack — student ID payment lookup (legacy static)
   Renders every institute / organization charge, balance,
   payment, and official receipt in the payment dialog.
   ========================================================= */

(function () {
  "use strict";

  var api = window.TCGC;
  var ID_RE = /^[A-Za-z0-9][A-Za-z0-9-]{3,14}$/;

  function money(value) {
    return "₱" + Number(value || 0).toLocaleString("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  function slug(value) {
    return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, "-");
  }

  function initials(name) {
    return String(name || "")
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map(function (part) { return part.charAt(0).toUpperCase(); })
      .join("");
  }

  function summarize(record) {
    var charges = (record.charges || []).map(function (charge) {
      var amount = Number(charge.amount || 0);
      var paid = Number(charge.paid || 0);
      return {
        label: charge.label,
        category: charge.category,
        scope: charge.scope,
        unit: charge.unit,
        amount: amount,
        paid: paid,
        dueDate: charge.dueDate,
        balance: Math.max(amount - paid, 0)
      };
    });

    var total = 0;
    var paid = 0;
    charges.forEach(function (charge) {
      total += charge.amount;
      paid += charge.paid;
    });

    var scopes = ["Institute", "Organization"]
      .map(function (scope) {
        var items = charges.filter(function (charge) { return charge.scope === scope; });
        var scopeTotal = 0;
        var scopePaid = 0;
        items.forEach(function (charge) {
          scopeTotal += charge.amount;
          scopePaid += charge.paid;
        });
        return {
          scope: scope,
          unit: items.length ? items[0].unit : "—",
          count: items.length,
          total: scopeTotal,
          paid: scopePaid,
          balance: Math.max(scopeTotal - scopePaid, 0)
        };
      })
      .filter(function (scope) { return scope.count > 0; });

    return {
      charges: charges,
      total: total,
      paid: paid,
      balance: Math.max(total - paid, 0),
      percent: total > 0 ? Math.round((paid / total) * 100) : 0,
      scopes: scopes
    };
  }

  function chargeStatus(charge) {
    if (charge.balance <= 0) return { label: "Paid", tone: "paid" };
    if (charge.paid > 0) return { label: "Partial", tone: "partial" };
    return { label: "Unpaid", tone: "due" };
  }

  function esc(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function normalizeRecord(record, studentId) {
    var source = record || {};

    return {
      name: esc(source.name || studentId || "Student"),
      institute: esc(source.institute || "—"),
      program: esc(source.program || "—"),
      yearLevel: esc(source.yearLevel || "—"),
      organization: esc(source.organization || "—"),
      statement: esc(source.statement || source.council || ""),
      updated: esc(source.updated || "—"),
      nextDue: esc(source.nextDue || "—"),
      charges: (Array.isArray(source.charges) ? source.charges : []).map(
        function (charge) {
          return {
            label: esc(charge.label || "Charge"),
            category: esc(charge.category || "Miscellaneous"),
            scope: esc(charge.scope || "Institute"),
            unit: esc(charge.unit || "—"),
            dueDate: esc(charge.dueDate || "—"),
            amount: Number(charge.amount || 0),
            paid: Number(charge.paid || 0)
          };
        }
      ),
      payments: (Array.isArray(source.payments) ? source.payments : []).map(
        function (payment) {
          return {
            label: esc(payment.label || "Payment"),
            date: esc(payment.date || "—"),
            ref: esc(payment.ref || "—"),
            method: esc(payment.method || "—"),
            amount: Number(payment.amount || 0)
          };
        }
      )
    };
  }

  function renderRecord(record, studentId) {
    record = normalizeRecord(record, studentId);
    var summary = summarize(record);
    var openCharges = summary.charges.filter(function (charge) {
      return charge.balance > 0;
    }).length;
    var isPaid = summary.balance <= 0;

    var scopeCards = summary.scopes.map(function (scope) {
      return (
        '<div class="track-scope">' +
          '<div class="track-scope__head">' +
            '<span class="track-scope__label">' + scope.scope + "</span>" +
            '<span class="track-scope__count">' + scope.count +
              (scope.count === 1 ? " charge" : " charges") + "</span>" +
          "</div>" +
          '<strong class="track-scope__unit">' + scope.unit + "</strong>" +
          '<div class="track-scope__row"><span>Charged</span><span>' +
            money(scope.total) + "</span></div>" +
          '<div class="track-scope__row"><span>Paid</span><span>' +
            money(scope.paid) + "</span></div>" +
          '<div class="track-scope__row track-scope__row--balance ' +
            (scope.balance > 0 ? "is-due" : "is-clear") + '">' +
            "<span>Balance</span><span>" + money(scope.balance) + "</span></div>" +
        "</div>"
      );
    }).join("");

    var chargeRows = summary.charges.map(function (charge) {
      var status = chargeStatus(charge);
      return (
        '<li class="track-charge">' +
          '<div class="track-charge__top">' +
            '<span class="track-cat track-cat--' + slug(charge.category) + '">' +
              charge.category + "</span>" +
            '<div class="track-charge__title">' +
              "<strong>" + charge.label + "</strong>" +
              "<small>" + charge.scope + " · " + charge.unit +
                " · Due " + charge.dueDate + "</small>" +
            "</div>" +
            '<span class="track-tag track-tag--' + status.tone + '">' +
              status.label + "</span>" +
          "</div>" +
          '<div class="track-charge__money">' +
            "<span>Amount <b>" + money(charge.amount) + "</b></span>" +
            "<span>Paid <b>" + money(charge.paid) + "</b></span>" +
            '<span class="' + (charge.balance > 0 ? "is-due" : "is-clear") + '">' +
              "Balance <b>" + money(charge.balance) + "</b></span>" +
          "</div>" +
        "</li>"
      );
    }).join("");

    var paymentRows = record.payments.map(function (payment) {
      return (
        "<li>" +
          '<span class="track-payment__icon">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
              '<path d="M20 6 9 17l-5-5" /></svg>' +
          "</span>" +
          '<div class="track-payment__body">' +
            "<strong>" + payment.label + "</strong>" +
            "<small>" + payment.date + " · " + payment.method + "</small>" +
          "</div>" +
          '<span class="track-receipt">' +
            '<span class="track-amount">' + money(payment.amount) + "</span>" +
            '<span class="track-ref">' + payment.ref + " · Verified</span>" +
          "</span>" +
        "</li>"
      );
    }).join("");

    return (
      '<div class="track-view">' +
        '<div class="track-head">' +
          '<span class="eyebrow">Payment record</span>' +
          '<div class="track-head__person">' +
            '<span class="track-avatar">' + initials(record.name) + "</span>" +
            "<div>" +
              '<h2 id="track-dialog-title">' + record.name + "</h2>" +
              '<p class="track-head__meta">' + studentId + " · " +
                record.program + " · " + record.yearLevel + "</p>" +
            "</div>" +
          "</div>" +
          '<div class="track-chips">' +
            '<span class="track-chip">Institute · ' + record.institute + "</span>" +
            '<span class="track-chip track-chip--org">Organization · ' +
              record.organization + "</span>" +
            '<span class="track-chip track-chip--muted">' +
              record.statement + "</span>" +
          "</div>" +
        "</div>" +

        '<div class="track-balance">' +
          '<div class="track-balance__row">' +
            "<span>Outstanding balance</span>" +
            "<span>" + summary.percent + "% paid</span>" +
          "</div>" +
          '<p class="track-balance__amount">' + money(summary.balance) + "</p>" +
          '<div class="track-bar"><span style="width:' + summary.percent + '%"></span></div>' +
          '<div class="track-balance__foot">' +
            "<span>Paid " + money(summary.paid) + "</span>" +
            "<span>Total " + money(summary.total) + "</span>" +
          "</div>" +
        "</div>" +

        '<div class="track-scopes">' + scopeCards + "</div>" +

        '<dl class="track-meta">' +
          "<div><dt>Status</dt><dd>" +
            '<span class="track-tag ' + (isPaid ? "track-tag--paid" : "track-tag--due") + '">' +
              (isPaid ? "Fully paid" : openCharges + (openCharges === 1 ? " charge open" : " charges open")) +
            "</span>" +
          "</dd></div>" +
          "<div><dt>Next due</dt><dd>" + record.nextDue + "</dd></div>" +
        "</dl>" +

        '<div class="track-section-head">' +
          '<h3 class="track-section-title">All charges</h3>' +
          '<span class="track-section-note">' + openCharges + " with balance · " +
            summary.charges.length + " total</span>" +
        "</div>" +
        '<ul class="track-charges">' + chargeRows + "</ul>" +

        '<div class="track-section-head">' +
          '<h3 class="track-section-title">Payments &amp; official receipts</h3>' +
          '<span class="track-section-note">' + record.payments.length + " receipts</span>" +
        "</div>" +
        '<ul class="track-payments">' + paymentRows + "</ul>" +

        '<p class="track-note">Balances updated ' + record.updated +
          '. Questions or corrections? Contact the Finance Office at ' +
          '<a href="mailto:finance@tcgc.edu.ph">finance@tcgc.edu.ph</a>.</p>' +
      "</div>"
    );
  }

  function renderMissing(studentId) {
    return (
      '<div class="track-empty">' +
        '<span class="track-empty__icon">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
            '<circle cx="11" cy="11" r="7" /><path d="m20 20-3.6-3.6" /></svg>' +
        "</span>" +
        '<span class="eyebrow">No record found</span>' +
        '<h2 id="track-dialog-title">We couldn&apos;t find that record</h2>' +
        "<p>No payment record matches <strong>" + esc(studentId) +
          "</strong> for your council. Check the Student ID, or contact the Finance Office if your assessment hasn&apos;t been posted yet.</p>" +
        '<button class="btn btn--primary" type="button" data-track-retry>Try another ID</button>' +
      "</div>"
    );
  }

  function renderLookupError() {
    return (
      '<div class="track-empty">' +
        '<span class="track-empty__icon">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
            '<circle cx="12" cy="12" r="9" /><path d="M12 7.5v5M12 16.5h.01" /></svg>' +
        "</span>" +
        '<span class="eyebrow">Lookup failed</span>' +
        '<h2 id="track-dialog-title">We couldn&apos;t check that record</h2>' +
        "<p>Check your connection and try again, or contact the Finance Office if this keeps happening.</p>" +
        '<button class="btn btn--primary" type="button" data-track-retry>Try again</button>' +
      "</div>"
    );
  }

  function init() {
    var form = document.getElementById("track");
    var input = document.getElementById("track-student-id");
    var error = document.getElementById("track-error");
    var dialog = document.getElementById("track-dialog");
    var result = document.getElementById("track-result");
    var close = document.getElementById("track-close");

    if (!form || !input || !dialog || !result) return;

    function openDialog() {
      document.body.classList.add("track-open");
      if (!dialog.open) dialog.showModal();
    }

    function show(id) {
      var normalized = id.trim().toUpperCase();

      if (api && api.setSession) {
        api.setSession(
          {
            role: "student",
            studentId: normalized,
            name: "",
            signedInAt: new Date().toISOString()
          },
          true
        );
      }

      window.location.href = "pages/student.html";
    }

    function submit() {
      var id = input.value.trim();

      if (!id) {
        if (error) error.textContent = "Enter your Student ID to track your payment.";
        input.focus();
        return;
      }

      if (!ID_RE.test(id)) {
        if (error) error.textContent = "Enter a valid Student ID.";
        input.focus();
        return;
      }

      if (error) error.textContent = "";
      show(id);
    }

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      submit();
    });

    input.addEventListener("input", function () {
      if (error) error.textContent = "";
    });

    if (close) {
      close.addEventListener("click", function () { dialog.close(); });
    }

    dialog.addEventListener("click", function (event) {
      if (event.target === dialog) dialog.close();
    });

    dialog.addEventListener("close", function () {
      document.body.classList.remove("track-open");
    });

    result.addEventListener("click", function (event) {
      var retry = event.target.closest("[data-track-retry]");
      if (!retry) return;
      dialog.close();
      window.setTimeout(function () { input.focus(); }, 150);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
