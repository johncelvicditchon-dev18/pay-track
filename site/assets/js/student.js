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
  var identityEl = document.getElementById("student-header-identity");
  var identityNameEl = document.getElementById("student-header-name");
  var identityIdEl = document.getElementById("student-header-id");
  var groupsEl = document.getElementById("student-groups");
  var councilFilter = document.getElementById("student-council-filter");
  var semesterFilter = document.getElementById("student-semester-filter");
  var printButton = document.getElementById("student-print");

  var allRecords = [];
  var rosterCouncils = [];
  var activeCouncil = "";
  var activeSemester = "";

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

  function updateIdentity(name, studentId) {
    if (!identityEl) return;

    if (identityNameEl) identityNameEl.textContent = name || "Student";
    if (identityIdEl) identityIdEl.textContent = studentId || "";

    identityEl.hidden = !(name || studentId);
  }

  function showGate() {
    document.body.classList.remove("is-dashboard");
    if (gate) gate.hidden = false;
    if (panel) panel.hidden = true;
    if (logoutButton) logoutButton.hidden = true;
    if (identityEl) identityEl.hidden = true;
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

  function paymentStamp(payment) {
    var dateLabel = formatDate(payment.date);
    var stamp = String(payment.recordedAt || "").trim();
    var parsed = stamp ? new Date(stamp) : null;

    if (parsed && !isNaN(parsed.getTime())) {
      var timeLabel = parsed.toLocaleTimeString("en-PH", {
        hour: "numeric",
        minute: "2-digit"
      });

      if (!dateLabel) {
        dateLabel = parsed.toLocaleDateString("en-PH", {
          month: "short",
          day: "numeric",
          year: "numeric"
        });
      }

      return dateLabel + " · " + timeLabel;
    }

    return dateLabel || "";
  }

  function semesterKey(charge) {
    var semester = String(charge.semester || "").trim();
    var year = String(charge.academicYear || "").trim();

    if (!semester && !year) return "";

    return (semester || "Unassigned") + (year ? " · " + year : "");
  }

  function applyRecordFilters(records) {
    return records
      .map(function (record) {
        var council = String(record.council || "").toUpperCase();

        if (activeCouncil && council !== activeCouncil) return null;

        var charges = (Array.isArray(record.charges) ? record.charges : []).filter(
          function (charge) {
            return !activeSemester || semesterKey(charge) === activeSemester;
          }
        );

        if (!charges.length) return null;

        return Object.assign({}, record, { charges: charges });
      })
      .filter(Boolean);
  }

  function populateFilters(records) {
    if (councilFilter) {
      var councils = {};

      (rosterCouncils || []).forEach(function (council) {
        councils[String(council || "").toUpperCase()] = true;
      });

      records.forEach(function (record) {
        if (!Array.isArray(record.charges) || !record.charges.length) return;

        var council = String(record.council || "").trim().toUpperCase();
        if (!council) return;
        councils[council] = true;
      });

      councilFilter.innerHTML =
        '<option value="">ALL COUNCILS/ORGS</option>' +
        Object.keys(councils)
          .sort()
          .map(function (council) {
            return (
              '<option value="' +
              esc(council) +
              '">' +
              esc(council) +
              "</option>"
            );
          })
          .join("");

      councilFilter.value = councils[activeCouncil] ? activeCouncil : "";
      activeCouncil = councilFilter.value;
    }

    if (semesterFilter) {
      var semesters = {};

      records.forEach(function (record) {
        (Array.isArray(record.charges) ? record.charges : []).forEach(
          function (charge) {
            var key = semesterKey(charge);
            if (!key) return;
            semesters[key] = true;
          }
        );
      });

      semesterFilter.innerHTML =
        '<option value="">ALL SEMESTERS</option>' +
        Object.keys(semesters)
          .sort()
          .map(function (key) {
            return (
              '<option value="' + esc(key) + '">' + esc(key) + "</option>"
            );
          })
          .join("");

      semesterFilter.value = semesters[activeSemester] ? activeSemester : "";
      activeSemester = semesterFilter.value;
    }
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
    var rows = [];

    function rowHtml(options) {
      return (
        "<tr>" +
        '<td class="student-payments-table__type">' +
        esc(charge.typeLabel) +
        "</td>" +
        '<td class="num">' +
        money(charge.amount) +
        "</td>" +
        '<td class="num">' +
        money(options.paid) +
        "</td>" +
        '<td class="num' +
        (options.balance > 0 ? " is-due" : "") +
        '">' +
        money(options.balance) +
        "</td>" +
        '<td><span class="student-type__status is-' +
        options.state +
        '">' +
        options.label +
        "</span></td>" +
        '<td class="student-payments-table__date">' +
        options.date +
        "</td>" +
        '<td class="student-payments-table__ref">' +
        options.ref +
        "</td>" +
        '<td class="num student-payments-table__amount">' +
        options.amount +
        "</td>" +
        '<td class="student-payments-table__by">' +
        options.by +
        "</td>" +
        "</tr>"
      );
    }

    if (!payments.length) {
      rows.push(
        rowHtml({
          paid: charge.paid,
          balance: remaining,
          state: state,
          label: stateLabel,
          date: '<span class="student-payments-table__empty">—</span>',
          ref: '<span class="student-payments-table__empty">—</span>',
          amount: '<span class="student-payments-table__empty">—</span>',
          by: charge.locked ? "Locked" : "No payment yet"
        })
      );
      return rows.join("");
    }

    var matchedTotal = payments.reduce(function (sum, payment) {
      return sum + payment.amount;
    }, 0);
    var runningPaid = Math.max(charge.paid - matchedTotal, 0);

    payments.forEach(function (payment) {
      runningPaid += payment.amount;

      var balanceAfter =
        payment.balanceAfter == null
          ? Math.max(charge.amount - runningPaid, 0)
          : payment.balanceAfter;
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

      rows.push(
        rowHtml({
          paid: runningPaid,
          balance: balanceAfter,
          state: balanceAfter > 0 ? "partial" : "paid",
          label: payment.paymentStatus
            ? esc(payment.paymentStatus)
            : balanceAfter > 0
            ? "Partial"
            : "Full",
          date: esc(paymentStamp(payment) || "—"),
          ref: payment.ref ? esc(payment.ref) : "—",
          amount: payment.amount > 0 ? money(payment.amount) : "—",
          by: assisted
        })
      );
    });

    return rows.join("");
  }

  function render(payments) {
    payments = applyRecordFilters(payments);

    var charges = [];

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
              recordedAt: String(payment.recordedAt || ""),
              ref: String(payment.ref || ""),
              amount: Number(payment.amount || 0),
              paymentStatus: String(payment.paymentStatus || ""),
              balanceAfter:
                payment.balanceAfter == null
                  ? null
                  : Number(payment.balanceAfter),
              recordedBy: String(payment.recordedBy || ""),
              recordedByPosition: String(payment.recordedByPosition || "")
            };
          })
        });
      });
    });

    if (!charges.length) {
      if (groupsEl) {
        groupsEl.innerHTML =
          activeCouncil || activeSemester
            ? '<div class="student-empty"><p>No records match the selected filters.</p><small>Choose a different council/organization or semester.</small></div>'
            : '<div class="student-empty"><p>No charges posted yet.</p><small>Your assessment will appear here once the Finance Office posts it.</small></div>';
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
        '<th class="num">Amount Paid</th>' +
        "<th>Assisted By</th>" +
        "</tr></thead>" +
        "<tbody>" +
        bodyRows +
        "</tbody>" +
        "</table>" +
        "</div>";
    }
  }

  function load(studentId, label) {
    if (!window.TCGCFirebase || !window.TCGCFirebase.findStudentPayments) {
      setError("Can't reach Firebase right now. Check your connection and try again.");
      return;
    }

    setError("");
    showPanel();
    updateIdentity(label || "", studentId);
    allRecords = [];
    rosterCouncils = [];
    activeCouncil = "";
    activeSemester = "";
    if (councilFilter) councilFilter.value = "";
    if (semesterFilter) semesterFilter.value = "";
    if (groupsEl) {
      groupsEl.innerHTML =
        '<div class="student-empty"><p><span class="spinner"></span> Loading your payments…</p></div>';
    }

    var displayName = label || "";
    var rosterStudent = null;

    function applyName(name) {
      if (name) displayName = name;
      if (!displayName) return;

      updateIdentity(displayName, studentId);

      if (api.updateSession) {
        api.updateSession({ name: displayName });
      }
    }

    var rosterPromise;

    if (window.TCGCFirebase.findStudents) {
      rosterPromise = window.TCGCFirebase.findStudents(studentId).catch(
        function () {
          return [];
        }
      );
    } else if (window.TCGCFirebase.findStudent) {
      rosterPromise = window.TCGCFirebase.findStudent(studentId)
        .then(function (student) {
          return student ? [student] : [];
        })
        .catch(function () {
          return [];
        });
    } else {
      rosterPromise = Promise.resolve([]);
    }

    rosterPromise.then(function (students) {
      var list = Array.isArray(students) ? students : [];

      rosterStudent = list[0] || null;
      rosterCouncils = list
        .map(function (student) {
          return String(student.council || "").trim().toUpperCase();
        })
        .filter(Boolean);

      if (rosterStudent) {
        applyName(label || formatName(rosterStudent));
      }

      populateFilters(allRecords);
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

        if (!payments || !payments.length) {
          if (groupsEl) {
            groupsEl.innerHTML = rosterStudent
              ? '<div class="student-empty"><p>No assessment posted yet.</p><small>Your payment record will appear here once the Finance Office posts it.</small></div>'
              : '<div class="student-empty"><p>No payment record found.</p><small>Check your Student ID, or contact the Finance Office if your assessment has not been posted.</small></div>';
          }
          return;
        }

        allRecords = payments.slice();
        populateFilters(allRecords);
        render(allRecords);
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
      window.location.href = "../index.html";
    });
  }

  if (councilFilter) {
    councilFilter.addEventListener("change", function () {
      activeCouncil = councilFilter.value;
      render(allRecords);
    });
  }

  if (semesterFilter) {
    semesterFilter.addEventListener("change", function () {
      activeSemester = semesterFilter.value;
      render(allRecords);
    });
  }

  if (printButton) {
    printButton.addEventListener("click", function () {
      window.print();
    });
  }

  var session = studentSession();
  if (session) {
    start(session.studentId, session.name || "");
  } else {
    showGate();
  }
})();
