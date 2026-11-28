/* =========================================================
   TCGC PayTrack — payments tab
   Payment records per imported student + lock/unlock.
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
  var tableHead = document.getElementById("payments-head");
  var tableFoot = document.getElementById("payments-foot");
  var filterSelect = document.getElementById("payment-record-filter");
  var searchInput = document.getElementById("payment-record-search");
  var typeRows = document.getElementById("payment-type-rows");
  var totalEl = document.getElementById("payment-total");

  var dialog = document.getElementById("payment-dialog");
  var form = document.getElementById("payment-form");
  var dialogClose = document.getElementById("payment-dialog-close");
  var cancelButton = document.getElementById("payment-cancel");
  var errorEl = document.getElementById("payment-error");
  var studentEl = document.getElementById("payment-student");
  var dateInput = document.getElementById("payment-date");
  var remainingEl = document.getElementById("payment-remaining");

  var records = [];
  var types = [];
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

  function esc(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function text(value) {
    var copy = String(value == null ? "" : value).trim();
    return copy ? esc(copy) : "—";
  }

  function roster() {
    return window.TCGCStudents && window.TCGCStudents.getStudents
      ? window.TCGCStudents.getStudents()
      : [];
  }

  function typeKey(value) {
    return String(value == null ? "" : value).trim().toLowerCase();
  }

  function chargeMatchesType(charge, type) {
    var label = typeKey(type.label || type.name);
    var name = typeKey(type.name || type.label);
    var chargeType = typeKey(charge.typeLabel || charge.label);
    var chargeLabel = typeKey(charge.label);

    return (
      chargeType === label ||
      chargeType === name ||
      chargeLabel === name
    );
  }

  function studentName(student) {
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
    return student.studentId;
  }

  function studentYear(student) {
    return String(student.year || student.yearLevel || "").trim();
  }

  function recordYear(record) {
    var year = String(
      (record && (record.yearLevel || record.year)) || ""
    ).trim();

    if (year) return year;

    var studentId = api.normalizeStudentId(record && record.studentId);
    var match = roster().filter(function (student) {
      return api.normalizeStudentId(student.studentId) === studentId;
    })[0];

    return match ? studentYear(match) : "";
  }

  function render() {
    var allStudents = roster().slice().sort(function (a, b) {
      return (
        String(a.lastName || "").localeCompare(String(b.lastName || ""), "en", {
          sensitivity: "base"
        }) ||
        String(a.firstName || "").localeCompare(String(b.firstName || ""), "en", {
          sensitivity: "base"
        }) ||
        String(a.studentId || "").localeCompare(String(b.studentId || ""))
      );
    });

    var query = searchInput ? searchInput.value.trim().toLowerCase() : "";
    var students = query
      ? allStudents.filter(function (student) {
          return (
            String(student.studentId || "") +
            " " +
            studentName(student)
          )
            .toLowerCase()
            .indexOf(query) !== -1;
        })
      : allStudents;

    var byStudent = {};
    records.forEach(function (record) {
      byStudent[api.normalizeStudentId(record.studentId)] = record;
    });

    var filter = filterSelect ? filterSelect.value : "";
    var columns = types.filter(function (type) {
      return !filter || typeKey(type.label || type.name) === typeKey(filter);
    });

    if (!students.length) {
      if (body) body.innerHTML = "";
      if (tableHead) tableHead.innerHTML = "";
      if (tableFoot) tableFoot.innerHTML = "";
      if (tableWrap) tableWrap.hidden = true;
      if (empty) {
        empty.hidden = false;
        empty.innerHTML = allStudents.length
          ? "<p>No students match your search.</p><small>Try another Student ID or name.</small>"
          : "<p>No students imported yet.</p><small>Import students first, then create payment types and record payments.</small>";
      }
      return;
    }

    if (empty) empty.hidden = true;
    if (tableWrap) tableWrap.hidden = false;

    if (tableHead) {
      tableHead.innerHTML =
        "<tr>" +
        '<th scope="col">Student ID</th>' +
        '<th scope="col">Full Name</th>' +
        columns
          .map(function (type) {
            return (
              '<th scope="col" class="num">' +
              esc(type.label || type.name || "Payment") +
              "<small>" +
              money(type.amount) +
              "</small></th>"
            );
          })
          .join("") +
        '<th scope="col">Status</th>' +
        "</tr>";
    }

    body.innerHTML = students
      .map(function (student) {
        var studentId = api.normalizeStudentId(student.studentId);
        var record = byStudent[studentId];
        var charges = record && Array.isArray(record.charges) ? record.charges : [];

        var cells = columns
          .map(function (type) {
            var matches = charges.filter(function (charge) {
              return chargeMatchesType(charge, type);
            });

            if (!matches.length) {
              return '<td class="num pay-cell">—</td>';
            }

            var amount = matches.reduce(function (sum, charge) {
              return sum + Number(charge.amount || 0);
            }, 0);
            var paid = matches.reduce(function (sum, charge) {
              return sum + Number(charge.paid || 0);
            }, 0);
            var settled = amount > 0 && paid >= amount;

            return (
              '<td class="num pay-cell' +
              (settled ? " is-paid" : "") +
              '"><b>' +
              money(paid) +
              "</b><small>of " +
              money(amount) +
              "</small></td>"
            );
          })
          .join("");

        var fullyPaid =
          types.length > 0 &&
          types.every(function (type) {
            var matches = charges.filter(function (charge) {
              return chargeMatchesType(charge, type);
            });

            if (!matches.length) return false;

            var amount = matches.reduce(function (sum, charge) {
              return sum + Number(charge.amount || 0);
            }, 0);
            var paid = matches.reduce(function (sum, charge) {
              return sum + Number(charge.paid || 0);
            }, 0);

            return amount > 0 && paid >= amount;
          });

        var hasAnyPaid = charges.some(function (charge) {
          return Number(charge.paid || 0) > 0;
        });

        var status = fullyPaid
          ? '<span class="pay-status pay-status--paid">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" ' +
            'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
            '<path d="M20 6 9 17l-5-5" /></svg>Paid</span>'
          : hasAnyPaid
          ? '<span class="pay-status pay-status--lack">LACKING PAYMENT</span>'
          : "";

        return (
          "<tr>" +
          "<td>" + text(studentId) + "</td>" +
          '<td class="cell-name">' + text(studentName(student)) + "</td>" +
          cells +
          "<td>" + status + "</td>" +
          "</tr>"
        );
      })
      .join("");

    var typeTotals = columns.map(function (type) {
      var unit = Number(type.amount || 0);
      var collected = 0;

      allStudents.forEach(function (student) {
        var record = byStudent[api.normalizeStudentId(student.studentId)];
        var charges = record && Array.isArray(record.charges) ? record.charges : [];

        charges.forEach(function (charge) {
          if (!chargeMatchesType(charge, type)) return;
          collected += Number(charge.paid || 0);
        });
      });

      return {
        unit: unit,
        count: allStudents.length,
        collected: collected,
        expected: unit * allStudents.length
      };
    });

    var grandAmount = 0;
    var grandPaid = 0;

    allStudents.forEach(function (student) {
      var record = byStudent[api.normalizeStudentId(student.studentId)];
      var charges = record && Array.isArray(record.charges) ? record.charges : [];

      charges.forEach(function (charge) {
        grandAmount += Number(charge.amount || 0);
        grandPaid += Number(charge.paid || 0);
      });
    });

    var grandBalance = Math.max(grandAmount - grandPaid, 0);

    if (tableFoot) {
      tableFoot.innerHTML =
        '<tr class="pay-total-row">' +
        '<td colspan="2" class="cell-name">TOTAL</td>' +
        typeTotals
          .map(function (total) {
            return (
              '<td class="num pay-cell"><b>' +
              money(total.collected) +
              "</b><small>of " +
              money(total.expected) +
              "</small></td>"
            );
          })
          .join("") +
        "<td>" +
        '<span class="row-note">' + money(grandBalance) + " balance</span>" +
        "</td>" +
        "</tr>";
    }
  }

  function load() {

    if (!COUNCIL) {
      records = [];
      render();
      if (empty) {
        empty.hidden = false;
        empty.innerHTML =
          "<p>No Council/Organization assigned.</p>" +
          "<small>Contact the Finance Office to assign your council or organization.</small>";
      }
      return;
    }

    if (!window.TCGCFirebase || !window.TCGCFirebase.loadPayments) {
      records = [];
      render();
      return;
    }

    window.TCGCFirebase.loadPayments(COUNCIL)
      .then(function (rows) {
        records = rows || [];
        render();
      })
      .catch(function (error) {
        console.warn("[payments] Could not load payment records:", error);
        records = [];
        render();
        if (empty) {
          empty.hidden = false;
          empty.innerHTML =
            "<p>We couldn't load the payment records right now.</p>" +
            "<small>Check your Firebase rules and connection, then try again.</small>";
        }
      });
  }

  function fillTypeSelect() {
    if (filterSelect) {
      var current = filterSelect.value;

      filterSelect.innerHTML =
        '<option value="">All payment types</option>' +
        types
          .map(function (type) {
            var label = type.label || type.name || "Payment";
            return (
              '<option value="' +
              esc(label) +
              '">' +
              esc(label) +
              (type.locked ? " \uD83D\uDD12\uFE0E" : "") +
              "</option>"
            );
          })
          .join("");

      var stillThere = types.some(function (type) {
        return (type.label || type.name) === current;
      });
      filterSelect.value = stillThere ? current : "";
    }
  }

  function loadTypes() {
    if (!COUNCIL || !window.TCGCFirebase || !window.TCGCFirebase.listPaymentTypes) {
      return;
    }

    window.TCGCFirebase.listPaymentTypes(COUNCIL)
      .then(function (rows) {
        types = rows || [];
        fillTypeSelect();
        render();

        if (
          activeRecord &&
          typeRows &&
          !typeRows.querySelector("input[data-type-id]")
        ) {
          renderPaymentRows(activeRecord);
        }
      })
      .catch(function (error) {
        console.warn("[payments] Could not load payment types:", error);
      });
  }

  if (filterSelect) {
    filterSelect.addEventListener("change", function () {
      render();
    });
  }

  if (searchInput) {
    searchInput.addEventListener("input", function () {
      render();
    });
  }

  /* ---------- record payment dialog ---------- */
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

  function recordFor(studentId) {
    var id = api.normalizeStudentId(studentId);
    return (
      records.filter(function (record) {
        return api.normalizeStudentId(record.studentId) === id;
      })[0] || null
    );
  }

  function updatePaymentTotal() {
    if (!typeRows) return;

    var total = 0;
    var remaining = 0;

    Array.prototype.forEach.call(
      typeRows.querySelectorAll("tr[data-balance]"),
      function (row) {
        var balance = Number(row.getAttribute("data-balance") || 0);
        var input = row.querySelector("input.pay-input");
        var entered = input ? Math.max(Number(input.value || 0), 0) : 0;

        total += entered;
        remaining += Math.max(balance - entered, 0);
      }
    );

    if (totalEl) totalEl.textContent = money(total);
    if (remainingEl) remainingEl.textContent = money(remaining);
  }

  function renderPaymentRows(record) {
    if (!typeRows) return;

    var charges = record && Array.isArray(record.charges) ? record.charges : [];

    if (!types.length) {
      typeRows.innerHTML =
        '<tr><td colspan="7" class="row-note">No payment types created yet.</td></tr>';
      updatePaymentTotal();
      return;
    }

    typeRows.innerHTML = types
      .map(function (type) {
        var matches = charges.filter(function (charge) {
          return chargeMatchesType(charge, type);
        });

        var amount = matches.length
          ? matches.reduce(function (sum, charge) {
              return sum + Number(charge.amount || 0);
            }, 0)
          : Number(type.amount || 0);
        var paid = matches.reduce(function (sum, charge) {
          return sum + Number(charge.paid || 0);
        }, 0);
        var remaining = Math.max(amount - paid, 0);
        var disabled = type.locked || remaining <= 0;
        var typeId = esc(type.id);

        return (
          '<tr data-balance="' + remaining.toFixed(2) + '">' +
          '<td class="cell-name">' +
          esc(type.label || type.name || "Payment") +
          '<small class="pay-form-note">' +
          (type.locked ? "Locked" : remaining <= 0 ? "Fully paid" : "") +
          "</small></td>" +
          '<td class="num">' + money(amount) + "</td>" +
          '<td class="num">' + money(paid) + "</td>" +
          '<td class="num">' + money(remaining) + "</td>" +
          "<td>" +
          (disabled
            ? '<span class="row-note">—</span>'
            : '<input type="checkbox" class="pay-full-check" data-type-id="' +
              typeId +
              '" aria-label="Full payment" />') +
          "</td>" +
          '<td class="num">' +
          (disabled
            ? '<span class="row-note">' +
              (type.locked ? "Locked" : "—") +
              "</span>"
            : '<input class="pay-input" type="number" min="0" step="0.01" data-type-id="' +
              typeId +
              '" max="' +
              remaining.toFixed(2) +
              '" placeholder="' +
              remaining.toFixed(2) +
              '" />') +
          "</td>" +
          "<td>" +
          (disabled
            ? '<span class="row-note">—</span>'
            : '<input class="pay-or" type="text" data-type-id="' +
              typeId +
              '" placeholder="#01" aria-label="Official Receipt Number" />') +
          "</td>" +
          "</tr>"
        );
      })
      .join("");

    updatePaymentTotal();
  }

  function openDialog(record) {
    if (!dialog || !record) return;

    activeRecord = record;
    if (studentEl) {
      var year = recordYear(record);
      studentEl.textContent =
        (record.name || "Student") +
        " · " +
        record.studentId +
        (year ? " · " + year : "");
    }

    renderPaymentRows(record);

    if (dateInput) dateInput.value = new Date().toISOString().slice(0, 10);

    setError("");
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "open");

    window.setTimeout(function () {
      var input = typeRows
        ? typeRows.querySelector("input.pay-input")
        : null;
      if (input) input.focus();
    }, 60);
  }

  if (typeRows) {
    typeRows.addEventListener("input", function (event) {
      if (!event.target || !event.target.matches("input.pay-input")) return;
      updatePaymentTotal();
    });

    typeRows.addEventListener("change", function (event) {
      var checkbox = event.target;
      if (!checkbox || !checkbox.matches(".pay-full-check")) return;

      var row = checkbox.closest("tr");
      var input = row ? row.querySelector("input.pay-input") : null;
      if (!input) return;

      if (checkbox.checked) {
        input.value = Number(input.getAttribute("max") || 0).toFixed(2);
        input.readOnly = true;
      } else {
        input.value = "";
        input.readOnly = false;
      }

      updatePaymentTotal();
    });
  }

  window.TCGCStartPayment = function (studentId, name) {
    if (!COUNCIL) return;

    function open(record) {
      if (!record.name && name) record.name = name;
      openDialog(record);
    }

    var existing = recordFor(studentId);
    if (existing) {
      open(existing);
      return;
    }

    if (!window.TCGCFirebase || !window.TCGCFirebase.findPaymentRecord) return;

    window.TCGCFirebase.findPaymentRecord(studentId, COUNCIL)
      .then(function (found) {
        open(
          found || {
            council: COUNCIL,
            studentId: studentId,
            name: name || "",
            charges: [],
            payments: []
          }
        );
      })
      .catch(function (error) {
        console.warn("[payments] Could not load the student's record:", error);
      });
  };

  if (form) {
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      if (!activeRecord || !typeRows) return;

      var date = dateInput.value;
      var entries = [];
      var missingRef = null;

      Array.prototype.forEach.call(
        typeRows.querySelectorAll("input.pay-input"),
        function (input) {
          var value = Number(input.value || 0);
          if (!(value > 0)) return;

          var type = types.filter(function (item) {
            return item.id === input.getAttribute("data-type-id");
          })[0];

          if (!type || type.locked) return;

          var row = input.closest("tr");
          var orInput = row ? row.querySelector(".pay-or") : null;
          var orValue = orInput ? orInput.value.trim() : "";

          if (!orValue && !missingRef) missingRef = orInput;

          entries.push({ type: type, amount: value, ref: orValue });
        }
      );

      if (!entries.length) {
        setError("Enter a payment amount for at least one payment type.");
        return;
      }
      if (!date) {
        setError("Select the payment date.");
        if (dateInput) dateInput.focus();
        return;
      }
      if (missingRef) {
        setError(
          "Enter the Official Receipt Number for every payment you entered."
        );
        missingRef.focus();
        return;
      }

      var submit = form.querySelector('button[type="submit"]');
      if (submit) submit.disabled = true;

      var studentName = activeRecord.name || "the student";
      var studentId = activeRecord.studentId;
      var officer = {
        name: session && session.name ? session.name : "",
        position: session && session.position ? session.position : "",
        studentId: session && session.studentId ? session.studentId : ""
      };
      var total = entries.reduce(function (sum, entry) {
        return sum + entry.amount;
      }, 0);

      var chain = entries.reduce(function (previous, entry) {
        return previous.then(function () {
          return window.TCGCFirebase.recordTypedPayment({
            council: COUNCIL,
            studentId: studentId,
            type: entry.type,
            amount: entry.amount,
            date: date,
            ref: entry.ref,
            method: "",
            officer: officer
          });
        });
      }, Promise.resolve());

      chain
        .then(function () {
          closeDialog();
          if (api.toast) {
            api.toast(
              "Payment recorded",
              money(total) + " recorded for " + studentName + ".",
              "success"
            );
          }
          load();
        })
        .catch(function (error) {
          console.warn("[payments] Record payment failed:", error);
          if (error && error.code === "locked-type") {
            setError(
              "A selected payment type is locked. Unlock it in Payment Types first."
            );
          } else {
            setError(
              "Couldn't save the payment. Check your session and Firestore rules, then try again."
            );
          }
          load();
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

  window.TCGCRefreshPayments = function () {
    loadTypes();
    load();
  };
  loadTypes();
  load();
})();
