/* =========================================================
   TCGC PayTrack — student ID payment lookup (legacy static)
   Renders every institute / organization charge, balance,
   payment, and official receipt in the payment dialog.
   ========================================================= */

(function () {
  "use strict";

  var ID_RE = /^[A-Za-z0-9][A-Za-z0-9-]{3,14}$/;

  var RECORDS = {
    "2024-00123": {
      name: "Maria Santos",
      institute: "ICS",
      program: "BSCS",
      yearLevel: "4TH YEAR",
      organization: "ICS Student Council",
      statement: "A.Y. 2026–2027 · 1st Semester",
      updated: "October 9, 2026",
      nextDue: "October 15, 2026",
      charges: [
        {
          label: "Activity contribution — Intramurals",
          category: "Activity",
          scope: "Institute",
          unit: "ICS",
          amount: 500,
          paid: 500,
          dueDate: "August 15, 2026"
        },
        {
          label: "ICS membership fee",
          category: "Membership",
          scope: "Organization",
          unit: "ICS Student Council",
          amount: 300,
          paid: 300,
          dueDate: "September 2, 2026"
        },
        {
          label: "T-shirt fee",
          category: "T-shirt",
          scope: "Institute",
          unit: "ICS",
          amount: 750,
          paid: 500,
          dueDate: "October 15, 2026"
        },
        {
          label: "Miscellaneous — Student ID replacement",
          category: "Miscellaneous",
          scope: "Institute",
          unit: "ICS",
          amount: 200,
          paid: 0,
          dueDate: "October 20, 2026"
        }
      ],
      payments: [
        {
          label: "Intramurals activity fee",
          date: "August 15, 2026",
          ref: "OR-2026-10428",
          amount: 500,
          method: "Cash · Finance Office"
        },
        {
          label: "ICS membership fee",
          date: "September 2, 2026",
          ref: "OR-2026-10577",
          amount: 300,
          method: "Cash · Finance Office"
        },
        {
          label: "T-shirt fee (partial)",
          date: "September 28, 2026",
          ref: "OR-2026-10702",
          amount: 500,
          method: "GCash · Finance Office"
        }
      ]
    },
    "2023-00456": {
      name: "Juan Dela Cruz",
      institute: "IBFS",
      program: "BSBA-FM",
      yearLevel: "3RD YEAR",
      organization: "IBFS Business Leaders Society",
      statement: "A.Y. 2026–2027 · 1st Semester",
      updated: "October 9, 2026",
      nextDue: "October 20, 2026",
      charges: [
        {
          label: "Activity contribution — Acquaintance",
          category: "Activity",
          scope: "Institute",
          unit: "IBFS",
          amount: 400,
          paid: 400,
          dueDate: "August 12, 2026"
        },
        {
          label: "IBFS membership fee",
          category: "Membership",
          scope: "Organization",
          unit: "IBFS Business Leaders Society",
          amount: 500,
          paid: 500,
          dueDate: "August 28, 2026"
        },
        {
          label: "T-shirt fee",
          category: "T-shirt",
          scope: "Institute",
          unit: "IBFS",
          amount: 600,
          paid: 0,
          dueDate: "October 20, 2026"
        }
      ],
      payments: [
        {
          label: "Acquaintance activity fee",
          date: "August 12, 2026",
          ref: "OR-2026-20114",
          amount: 400,
          method: "Cash · Finance Office"
        },
        {
          label: "IBFS membership fee",
          date: "August 28, 2026",
          ref: "OR-2026-20203",
          amount: 500,
          method: "Cash · Finance Office"
        }
      ]
    },
    "2025-00789": {
      name: "Ana Reyes",
      institute: "ITE",
      program: "BEED",
      yearLevel: "2ND YEAR",
      organization: "ITE Educators' Guild",
      statement: "A.Y. 2026–2027 · 1st Semester",
      updated: "October 9, 2026",
      nextDue: "Fully paid for this semester",
      charges: [
        {
          label: "Activity contribution — Field trip",
          category: "Activity",
          scope: "Institute",
          unit: "ITE",
          amount: 500,
          paid: 500,
          dueDate: "August 5, 2026"
        },
        {
          label: "ITE membership fee",
          category: "Membership",
          scope: "Organization",
          unit: "ITE Educators' Guild",
          amount: 400,
          paid: 400,
          dueDate: "August 5, 2026"
        },
        {
          label: "T-shirt fee",
          category: "T-shirt",
          scope: "Institute",
          unit: "ITE",
          amount: 500,
          paid: 500,
          dueDate: "August 5, 2026"
        }
      ],
      payments: [
        {
          label: "Field trip activity fee",
          date: "August 5, 2026",
          ref: "OR-2026-30021",
          amount: 500,
          method: "Cash · Finance Office"
        },
        {
          label: "ITE membership fee",
          date: "August 5, 2026",
          ref: "OR-2026-30022",
          amount: 400,
          method: "Cash · Finance Office"
        },
        {
          label: "T-shirt fee",
          date: "August 5, 2026",
          ref: "OR-2026-30023",
          amount: 500,
          method: "GCash · Finance Office"
        }
      ]
    }
  };

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
    var charges = record.charges.map(function (charge) {
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

  function renderRecord(record, studentId) {
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
        '<h2 id="track-dialog-title">We couldn&apos;t find that ID</h2>' +
        "<p>No payment record matches <strong>" + studentId +
          "</strong>. Check the student ID on your school ID card, or contact the Finance Office for help.</p>" +
        '<button class="btn btn--primary" type="button" data-track-retry>Try another ID</button>' +
        '<p class="track-empty__hint">Demo IDs: 2024-00123 · 2023-00456 · 2025-00789</p>' +
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
      if (RECORDS[normalized]) {
        result.innerHTML = renderRecord(RECORDS[normalized], normalized);
      } else {
        result.innerHTML = renderMissing(normalized);
      }
      openDialog();
    }

    function submit() {
      var id = input.value.trim();

      if (!id) {
        if (error) error.textContent = "Enter your Student ID to track your payment.";
        input.focus();
        return;
      }

      if (!ID_RE.test(id)) {
        if (error) error.textContent = "Enter a valid Student ID (for example 2024-00123).";
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

    Array.prototype.forEach.call(
      document.querySelectorAll("[data-demo-id]"),
      function (button) {
        button.addEventListener("click", function () {
          input.value = button.getAttribute("data-demo-id") || "";
          submit();
        });
      }
    );

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
