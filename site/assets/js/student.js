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
  var groupsEl = document.getElementById("student-groups");
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
    document.body.classList.remove("is-dashboard");
    if (gate) gate.hidden = false;
    if (panel) panel.hidden = true;
    if (logoutButton) logoutButton.hidden = true;
    document.title = "My payments · TCGC PayTrack";
  }

  function showPanel() {
    document.body.classList.add("is-dashboard");
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

  function formatDate(value) {
    var raw = String(value || "").trim();
    if (!raw || raw === "—") return "";

    var parsed = new Date(raw.length <= 10 ? raw + "T00:00:00" : raw);
    if (isNaN(parsed.getTime())) return raw;

    return parsed.toLocaleDateString("en-PH", {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  }

  function chargeRows(charge) {
    var remaining = Math.max(charge.amount - charge.paid, 0);
    var state = charge.locked
      ? "locked"
      : remaining <= 0
      ? "paid"
      : charge.paid > 0
      ? "partial"
      : "unpaid";
    var stateLabel = charge.locked
      ? "Locked"
      : remaining <= 0
      ? "Paid"
      : charge.paid > 0
      ? "Partial"
      : "Unpaid";
    var payments = Array.isArray(charge.payments) ? charge.payments : [];
    var rowspan = Math.max(payments.length, 1);
    var rows = [];

    function leadCells() {
      return (
        '<td class="student-payments-table__type" rowspan="' +
        rowspan +
        '">' +
        esc(charge.typeLabel) +
        "</td>" +
        '<td class="num" rowspan="' +
        rowspan +
        '">' +
        money(charge.amount) +
        "</td>" +
        '<td class="num" rowspan="' +
        rowspan +
        '">' +
        money(charge.paid) +
        "</td>" +
        '<td class="num' +
        (remaining > 0 ? " is-due" : "") +
        '" rowspan="' +
        rowspan +
        '">' +
        money(remaining) +
        "</td>" +
        '<td rowspan="' +
        rowspan +
        '"><span class="student-type__status is-' +
        state +
        '">' +
        stateLabel +
        "</span></td>"
      );
    }

    if (!payments.length) {
      rows.push(
        "<tr>" +
          leadCells() +
          '<td class="student-payments-table__empty">—</td>' +
          '<td class="student-payments-table__empty">—</td>' +
          '<td class="student-payments-table__by">' +
          (charge.locked
            ? "Locked"
            : charge.paid > 0
            ? "Details unavailable"
            : "No payment yet") +
          "</td></tr>"
      );
      return rows.join("");
    }

    payments.forEach(function (payment, index) {
      var cells = index === 0 ? leadCells() : "";
      var assisted = payment.recordedBy
        ? "<b>" +
          esc(payment.recordedBy) +
          "</b>" +
          (payment.recordedByPosition
            ? '<span class="student-payments-table__position">' +
              esc(payment.recordedByPosition) +
              "</span>"
            : "")
        : "—";

      cells +=
        '<td class="student-payments-table__date">' +
        esc(formatDate(payment.date) || "—") +
        "</td>" +
        '<td class="student-payments-table__ref">' +
        (payment.ref ? esc(payment.ref) : "—") +
        "</td>" +
        '<td class="student-payments-table__by">' +
        assisted +
        "</td>";

      rows.push("<tr>" + cells + "</tr>");
    });

    return rows.join("");
  }

  function render(payments) {
    var charges = [];
    var updated = "";

    payments.forEach(function (record) {
      var receipts = Array.isArray(record.payments) ? record.payments : [];

      (Array.isArray(record.charges) ? record.charges : []).forEach(function (charge) {
        var typeLabel = String(charge.typeLabel || charge.label || "Payment");
        var typeName = String(charge.label || typeLabel);
        var matches = receipts
          .filter(function (payment) {
            var label = String(payment.label || "");
            return label === typeLabel || label === typeName;
          })
          .sort(function (a, b) {
            return String(a.date || "").localeCompare(String(b.date || ""));
          });

        charges.push({
          typeLabel: typeLabel,
          semester: String(charge.semester || ""),
          academicYear: String(charge.academicYear || ""),
          amount: Number(charge.amount || 0),
          paid: Number(charge.paid || 0),
          locked: Boolean(charge.locked),
          payments: matches.map(function (payment) {
            return {
              date: String(payment.date || ""),
              ref: String(payment.ref || ""),
              amount: Number(payment.amount || 0),
              recordedBy: String(payment.recordedBy || ""),
              recordedByPosition: String(payment.recordedByPosition || "")
            };
          })
        });
      });

      if (record.updated) updated = String(record.updated);
    });

    if (!charges.length) {
      if (groupsEl) {
        groupsEl.innerHTML =
          '<div class="student-empty"><p>No charges posted yet.</p><small>Your assessment will appear here once the Finance Office posts it.</small></div>';
      }
      return;
    }

    if (groupsEl) {
      var bodyRows = groupCharges(charges)
        .map(function (group) {
          return group.charges.map(chargeRows).join("");
        })
        .join("");

      groupsEl.innerHTML =
        '<div class="student-table-wrap">' +
        '<table class="student-payments-table">' +
        "<thead><tr>" +
        "<th>Payment Type</th>" +
        '<th class="num">Amount Due</th>' +
        '<th class="num">Paid</th>' +
        '<th class="num">Balance</th>' +
        "<th>Status</th>" +
        "<th>Payment Date</th>" +
        "<th>Official Receipt Number</th>" +
        "<th>Assisted By</th>" +
        "</tr></thead>" +
        "<tbody>" +
        bodyRows +
        "</tbody>" +
        "</table>" +
        "</div>";
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
          if (groupsEl) {
            groupsEl.innerHTML = rosterStudent
              ? '<div class="student-empty"><p>No assessment posted yet.</p><small>Your payment record will appear here once the Finance Office posts it.</small></div>'
              : '<div class="student-empty"><p>No payment record found.</p><small>Check your Student ID, or contact the Finance Office if your assessment has not been posted.</small></div>';
          }
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
