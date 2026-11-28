/* =========================================================
   TCGC PayTrack — student payment dashboard
   ========================================================= */

(function () {
  "use strict";

  var api = window.TCGC;
  if (!api) return;

  var gate = document.getElementById("student-gate");
  var panel = document.getElementById("student-panel");
  var form = document.getElementById("student-id-form");
  var input = document.getElementById("student-id-input");
  var errorEl = document.getElementById("student-error");
  var logoutButton = document.getElementById("student-logout");
  var nameEl = document.getElementById("student-name");
  var metaEl = document.getElementById("student-meta");
  var statsEl = document.getElementById("student-stats");
  var groupsEl = document.getElementById("student-groups");
  var receiptsEl = document.getElementById("student-receipts");
  var receiptListEl = document.getElementById("student-receipt-list");
  var updatedEl = document.getElementById("student-updated");

  var SEMESTER_ORDER = ["1ST SEMESTER", "2ND SEMESTER", "SUMMER"];

  function esc(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function money(value) {
    return (
      "₱" +
      Number(value || 0).toLocaleString("en-PH", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })
    );
  }

  function formatName(student) {
    if (!student) return "";

    var lastName = String(student.lastName || "").trim();
    var given = [student.firstName, student.middleName]
      .map(function (part) {
        return String(part || "").trim();
      })
      .filter(Boolean)
      .join(" ");

    if (lastName && given) return lastName + ", " + given;
    if (lastName) return lastName;
    if (given) return given;
    return String(student.name || "").trim();
  }

  function setError(message) {
    if (!errorEl) return;
    errorEl.textContent = message || "";
    errorEl.hidden = !message;
    input.setAttribute("aria-invalid", message ? "true" : "false");
  }

  function studentSession() {
    var session = api.getSession ? api.getSession() : null;
    return session && session.role === "student" ? session : null;
  }

  function showGate() {
    if (gate) gate.hidden = false;
    if (panel) panel.hidden = true;
    if (logoutButton) logoutButton.hidden = true;
    document.title = "My payments · TCGC PayTrack";
  }

  function showPanel() {
    if (gate) gate.hidden = true;
    if (panel) panel.hidden = false;
    if (logoutButton) logoutButton.hidden = false;
  }

  function groupCharges(charges) {
    var groups = {};

    charges.forEach(function (charge) {
      var semester = String(charge.semester || "").trim();
      var year = String(charge.academicYear || "").trim();
      var key = (semester || "UNASSIGNED") + "||" + year;

      if (!groups[key]) {
        groups[key] = {
          semester: semester || "Unassigned semester",
          year: year,
          charges: []
        };
      }

      groups[key].charges.push(charge);
    });

    return Object.keys(groups)
      .map(function (key) {
        return groups[key];
      })
      .sort(function (a, b) {
        var ai = SEMESTER_ORDER.indexOf(a.semester.toUpperCase());
        var bi = SEMESTER_ORDER.indexOf(b.semester.toUpperCase());
        if (a.year !== b.year) return String(b.year).localeCompare(String(a.year));
        if (ai === -1) return 1;
        if (bi === -1) return -1;
        return ai - bi;
      });
  }

  function render(payments) {
    var charges = [];
    var receipts = [];
    var updated = "";

    payments.forEach(function (record) {
      (Array.isArray(record.charges) ? record.charges : []).forEach(function (charge) {
        charges.push({
          label: String(charge.label || charge.typeLabel || "Payment"),
          typeLabel: String(charge.typeLabel || charge.label || "Payment"),
          semester: String(charge.semester || ""),
          academicYear: String(charge.academicYear || ""),
          amount: Number(charge.amount || 0),
          paid: Number(charge.paid || 0),
          dueDate: String(charge.dueDate || "—"),
          locked: Boolean(charge.locked)
        });
      });

      (Array.isArray(record.payments) ? record.payments : []).forEach(function (payment) {
        receipts.push({
          label: String(payment.label || "Payment"),
          date: String(payment.date || "—"),
          ref: String(payment.ref || "—"),
          method: String(payment.method || ""),
          amount: Number(payment.amount || 0),
          recordedBy: String(payment.recordedBy || "")
        });
      });

      if (record.updated) updated = String(record.updated);
    });

    var total = charges.reduce(function (sum, charge) {
      return sum + charge.amount;
    }, 0);
    var paid = charges.reduce(function (sum, charge) {
      return sum + charge.paid;
    }, 0);
    var balance = Math.max(total - paid, 0);

    if (statsEl) {
      statsEl.innerHTML =
        '<article class="student-stat"><span>Total billed</span><strong>' +
        money(total) +
        "</strong></article>" +
        '<article class="student-stat"><span>Total paid</span><strong>' +
        money(paid) +
        "</strong></article>" +
        '<article class="student-stat student-stat--accent"><span>Balance</span><strong>' +
        money(balance) +
        "</strong></article>";
    }

    if (!charges.length) {
      if (groupsEl) {
        groupsEl.innerHTML =
          '<div class="student-empty"><p>No charges posted yet.</p><small>Your assessment will appear here once the Finance Office posts it.</small></div>';
      }
      if (receiptsEl) receiptsEl.hidden = true;
      return;
    }

    if (groupsEl) {
      groupsEl.innerHTML = groupCharges(charges)
        .map(function (group) {
          var groupTotal = group.charges.reduce(function (sum, charge) {
            return sum + charge.amount;
          }, 0);
          var groupPaid = group.charges.reduce(function (sum, charge) {
            return sum + charge.paid;
          }, 0);

          var rows = group.charges
            .map(function (charge) {
              var remaining = Math.max(charge.amount - charge.paid, 0);
              var status = charge.locked
                ? "Locked"
                : remaining <= 0
                ? "Paid"
                : charge.paid > 0
                ? "Partial"
                : "Unpaid";

              return (
                '<div class="student-type">' +
                '<div class="student-type__maintop">' +
                "<strong>" +
                esc(charge.typeLabel) +
                "</strong>" +
                "<small>" +
                esc(charge.label) +
                " · Due " +
                esc(charge.dueDate) +
                " · " +
                status +
                "</small>" +
                "</div>" +
                '<div class="student-type__amounts">' +
                "<b>" +
                money(charge.amount) +
                "</b>" +
                "<span>Paid " +
                money(charge.paid) +
                "</span>" +
                '<span class="' +
                (remaining > 0 ? "is-due" : "") +
                '">Balance ' +
                money(remaining) +
                "</span>" +
                "</div>" +
                "</div>"
              );
            })
            .join("");

          return (
            '<article class="student-semester">' +
            '<header class="student-semester__head">' +
            "<div><h2>" +
            esc(group.semester) +
            (group.year ? " · " + esc(group.year) : "") +
            "</h2><p>" +
            group.charges.length +
            (group.charges.length === 1 ? " payment type" : " payment types") +
            "</p></div>" +
            '<span class="student-semester__total">' +
            money(groupTotal - groupPaid) +
            " balance</span>" +
            "</header>" +
            rows +
            "</article>"
          );
        })
        .join("");
    }

    if (receiptsEl && receiptListEl) {
      if (receipts.length) {
        receiptsEl.hidden = false;
        receiptListEl.innerHTML = receipts
          .map(function (receipt) {
            return (
              "<li><span><b>" +
              esc(receipt.label) +
              "</b><br /><small>" +
              esc(receipt.date) +
              (receipt.method ? " · " + esc(receipt.method) : "") +
              (receipt.recordedBy ? " · Assisted by " + esc(receipt.recordedBy) : "") +
              "</small></span><span><b>" +
              money(receipt.amount) +
              "</b><br /><small>" +
              esc(receipt.ref) +
              "</small></span></li>"
            );
          })
          .join("");
      } else {
        receiptsEl.hidden = true;
      }
    }

    if (updatedEl) {
      updatedEl.textContent = updated
        ? "Balances updated " + updated + ". Questions? Contact the Finance Office."
        : "";
    }
  }

  function load(studentId, label) {
    if (!window.TCGCFirebase || !window.TCGCFirebase.findStudentPayments) {
      setError("Can't reach Firebase right now. Check your connection and try again.");
      return;
    }

    setError("");
    showPanel();
    if (nameEl) nameEl.textContent = label || "Student";
    if (metaEl) metaEl.textContent = studentId;
    if (statsEl) statsEl.innerHTML = "";
    if (groupsEl) {
      groupsEl.innerHTML =
        '<div class="student-empty"><p><span class="spinner"></span> Loading your payments…</p></div>';
    }

    var displayName = label || "";
    var rosterStudent = null;

    function applyName(name) {
      if (name) displayName = name;
      if (!displayName) return;

      if (nameEl) nameEl.textContent = displayName;
      document.title = displayName + " · My payments · TCGC PayTrack";

      if (api.updateSession) {
        api.updateSession({ name: displayName });
      }
    }

    var rosterPromise =
      window.TCGCFirebase.findStudent
        ? window.TCGCFirebase.findStudent(studentId).catch(function () {
            return null;
          })
        : Promise.resolve(null);

    rosterPromise.then(function (student) {
      rosterStudent = student || null;

      if (!rosterStudent) return;

      applyName(label || formatName(rosterStudent));

      var details = [studentId];
      if (rosterStudent.council) details.push(rosterStudent.council);
      if (rosterStudent.year) details.push(rosterStudent.year);
      if (rosterStudent.program) details.push(rosterStudent.program);
      if (metaEl) metaEl.textContent = details.join(" · ");
    });

    window.TCGCFirebase.findStudentPayments(studentId)
      .then(function (payments) {
        var record = payments && payments[0];

        applyName(
          label ||
            formatName(rosterStudent) ||
            (record && record.name) ||
            ""
        );

        var details = [studentId];
        if (record && record.council) details.push(record.council);
        if (record && record.yearLevel) details.push(record.yearLevel);
        if (metaEl) metaEl.textContent = details.join(" · ");

        if (!payments || !payments.length) {
          if (statsEl) statsEl.innerHTML = "";
          if (groupsEl) {
            groupsEl.innerHTML = rosterStudent
              ? '<div class="student-empty"><p>No assessment posted yet.</p><small>Your payment record will appear here once the Finance Office posts it.</small></div>'
              : '<div class="student-empty"><p>No payment record found.</p><small>Check your Student ID, or contact the Finance Office if your assessment has not been posted.</small></div>';
          }
          if (receiptsEl) receiptsEl.hidden = true;
          return;
        }

        render(payments);
      })
      .catch(function (error) {
        console.warn("[student] Payment load failed:", error);
        if (groupsEl) {
          groupsEl.innerHTML =
            '<div class="student-empty"><p>We couldn\'t load your payments.</p><small>Check your connection and try again, or contact the Finance Office.</small></div>';
        }
      });
  }

  function start(studentId, label) {
    showPanel();
    load(studentId, label);
    document.title = (label ? label + " · " : "") + "My payments · TCGC PayTrack";
  }

  if (form && input) {
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      var studentId = api.normalizeStudentId(input.value);

      if (!studentId) {
        setError("Enter your Student ID.");
        input.focus();
        return;
      }

      api.setSession(
        {
          role: "student",
          studentId: studentId,
          name: "",
          signedInAt: new Date().toISOString()
        },
        true
      );

      start(studentId, "");
    });
  }

  if (logoutButton) {
    logoutButton.addEventListener("click", function () {
      api.clearSession();
      api.toast("Signed out", "You have been logged out.", "info");
      showGate();
    });
  }

  var session = studentSession();
  if (session) {
    start(session.studentId, session.name || "");
  } else {
    showGate();
  }
})();
