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

  function icon(paths) {
    return (
      '<svg class="student-type__icon" viewBox="0 0 24 24" fill="none" ' +
      'stroke="currentColor" stroke-width="2" stroke-linecap="round" ' +
      'stroke-linejoin="round" aria-hidden="true">' +
      paths +
      "</svg>"
    );
  }

  function chargeCard(charge) {
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
    var last = charge.lastPayment;
    var meta = [];

    if (last && (last.date || last.recordedBy || last.ref)) {
      if (last.date) {
        meta.push(
          '<span class="student-type__meta-item">' +
            icon(
              '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 11h18"/>'
            ) +
            "Paid on " +
            esc(formatDate(last.date)) +
            "</span>"
        );
      }

      if (last.recordedBy) {
        meta.push(
          '<span class="student-type__meta-item">' +
            icon(
              '<circle cx="12" cy="8" r="3.2"/><path d="M5 20a7 7 0 0 1 14 0"/>'
            ) +
            "Assisted by <b>" +
            esc(last.recordedBy) +
            "</b>" +
            (last.recordedByPosition
              ? " · " + esc(last.recordedByPosition)
              : "") +
            "</span>"
        );
      }

      if (last.ref) {
        meta.push(
          '<span class="student-type__meta-item">' +
            icon(
              '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2Z"/><path d="M9 8h6M9 12h6"/>'
            ) +
            "Official Receipt Number <b>" +
            esc(last.ref) +
            "</b></span>"
        );
      }

      if (charge.paymentCount > 1) {
        meta.push(
          '<span class="student-type__meta-item is-quiet">' +
            charge.paymentCount +
            " payments recorded</span>"
        );
      }
    } else {
      meta.push(
        '<span class="student-type__meta-item is-quiet">' +
          (charge.locked
            ? "Payment type locked"
            : charge.paid > 0
            ? "Payment details unavailable"
            : "No payment recorded yet") +
          "</span>"
      );
    }

    return (
      '<article class="student-type is-' +
      state +
      '">' +
      '<header class="student-type__head">' +
      "<h3>" +
      esc(charge.typeLabel) +
      "</h3>" +
      '<span class="student-type__status is-' +
      state +
      '">' +
      stateLabel +
      "</span>" +
      "</header>" +
      '<div class="student-type__figures">' +
      '<div class="student-type__figure"><span>Amount due</span><strong>' +
      money(charge.amount) +
      "</strong></div>" +
      '<div class="student-type__figure"><span>Paid</span><strong>' +
      money(charge.paid) +
      "</strong></div>" +
      '<div class="student-type__figure"><span>Balance</span><strong' +
      (remaining > 0 ? ' class="is-due"' : "") +
      ">" +
      money(remaining) +
      "</strong></div>" +
      "</div>" +
      '<div class="student-type__meta">' +
      meta.join("") +
      "</div>" +
      "</article>"
    );
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
          paymentCount: matches.length,
          lastPayment: matches.length ? matches[matches.length - 1] : null
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
      groupsEl.innerHTML = groupCharges(charges)
        .map(function (group) {
          var groupBalance = group.charges.reduce(function (sum, charge) {
            return sum + Math.max(charge.amount - charge.paid, 0);
          }, 0);

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
            '<span class="student-semester__total' +
            (groupBalance > 0 ? "" : " is-clear") +
            '">' +
            (groupBalance > 0
              ? money(groupBalance) + " balance"
              : "Fully paid") +
            "</span>" +
            "</header>" +
            '<div class="student-semester__body">' +
            group.charges.map(chargeCard).join("") +
            "</div>" +
            "</article>"
          );
        })
        .join("");
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
