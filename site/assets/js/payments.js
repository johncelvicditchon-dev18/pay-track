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
  var typeSelect = document.getElementById("payment-type-select");
  var filterSelect = document.getElementById("payment-record-filter");

  var dialog = document.getElementById("payment-dialog");
  var form = document.getElementById("payment-form");
  var dialogClose = document.getElementById("payment-dialog-close");
  var cancelButton = document.getElementById("payment-cancel");
  var errorEl = document.getElementById("payment-error");
  var studentEl = document.getElementById("payment-student");
  var amountInput = document.getElementById("payment-amount");
  var dateInput = document.getElementById("payment-date");
  var refInput = document.getElementById("payment-ref");

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

  function rosterNames() {
    var list =
      window.TCGCStudents && window.TCGCStudents.getStudents
        ? window.TCGCStudents.getStudents()
        : [];
    var map = {};

    list.forEach(function (student) {
      var id = api.normalizeStudentId(student.studentId);
      var name = [student.firstName, student.middleName, student.lastName]
        .filter(Boolean)
        .join(" ")
        .trim();
      map[id] = name || id;
    });

    return map;
  }

  function flatten() {
    var names = rosterNames();
    var rows = [];

    records.forEach(function (record) {
      var id = api.normalizeStudentId(record.studentId);
      var name = names[id] || record.name || id;

      (Array.isArray(record.charges) ? record.charges : []).forEach(
        function (charge, index) {
          var recordedBy = charge.assessedBy || "";
          if (!recordedBy && Array.isArray(record.payments)) {
            var match = record.payments.filter(function (payment) {
              return (
                String(payment.label || "").toLowerCase() ===
                String(charge.typeLabel || charge.label || "").toLowerCase()
              );
            })[0];
            recordedBy = match ? match.recordedBy || "" : "";
          }

          rows.push({
            record: record,
            charge: charge,
            index: index,
            studentId: id,
            studentName: name,
            recordedBy: recordedBy
          });
        }
      );
    });

    rows.sort(function (a, b) {
      return (
        a.studentName.localeCompare(b.studentName, "en", {
          sensitivity: "base"
        }) ||
        String(a.charge.typeLabel || a.charge.label || "").localeCompare(
          String(b.charge.typeLabel || b.charge.label || "")
        )
      );
    });

    var filter = filterSelect ? filterSelect.value : "";
    if (filter) {
      rows = rows.filter(function (row) {
        return (
          String(row.charge.typeLabel || row.charge.label || "") === filter
        );
      });
    }

    return rows;
  }

  function payableBalance(record) {
    return (Array.isArray(record.charges) ? record.charges : []).reduce(
      function (sum, charge) {
        if (charge.locked) return sum;
        return (
          sum +
          Math.max(Number(charge.amount || 0) - Number(charge.paid || 0), 0)
        );
      },
      0
    );
  }

  function render() {
    var rows = flatten();

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
        var charge = row.charge;
        var locked = Boolean(charge.locked);

        return (
          "<tr>" +
          "<td>" + text(row.studentId) + "</td>" +
          '<td class="cell-name">' + text(row.studentName) + "</td>" +
          "<td>" + text(charge.typeLabel || charge.label || "Payment") + "</td>" +
          '<td class="num">' + money(charge.amount) + "</td>" +
          '<td><span class="pay-status ' +
          (locked ? "pay-status--due" : "pay-status--paid") +
          '">' +
          (locked ? "Locked" : "Unlocked") +
          "</span></td>" +
          "<td>" + text(row.recordedBy) + "</td>" +
          '<td class="cell-actions">' +
          '<button class="row-action' +
          (locked ? "" : " row-action--danger") +
          '" type="button" data-lock-student="' +
          esc(row.studentId) +
          '" data-lock-index="' +
          row.index +
          '" data-lock-id="' +
          esc(charge.id || "") +
          '" data-lock-state="' +
          (locked ? "true" : "false") +
          '">' +
          (locked ? "Unlock Payment" : "Lock Payment") +
          "</button>" +
          "</td>" +
          "</tr>"
        );
      })
      .join("");
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
    if (typeSelect) {
      typeSelect.innerHTML =
        '<option value="" disabled selected>Select a payment type</option>' +
        types
          .map(function (type) {
            return (
              '<option value="' +
              esc(type.id) +
              '"' +
              (type.locked ? " disabled" : "") +
              ">" +
              esc(type.label || type.name || "Payment") +
              " · " +
              money(type.amount) +
              (type.locked ? " \uD83D\uDD12\uFE0E" : "") +
              "</option>"
            );
          })
          .join("");
    }

    if (filterSelect) {
      var current = filterSelect.value;

      filterSelect.innerHTML =
        '<option value="">All payment types</option>' +
        types
          .map(function (type) {
            var name = type.name || type.label || "Payment";
            return (
              '<option value="' +
              esc(name) +
              '">' +
              esc(name) +
              (type.locked ? " \uD83D\uDD12\uFE0E" : "") +
              "</option>"
            );
          })
          .join("");

      var stillThere = types.some(function (type) {
        return (type.name || type.label) === current;
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

  if (body) {
    body.addEventListener("click", function (event) {
      var button =
        event.target && event.target.closest
          ? event.target.closest("[data-lock-student]")
          : null;
      if (!button) return;

      var studentId = button.getAttribute("data-lock-student");
      var currentlyLocked = button.getAttribute("data-lock-state") === "true";
      var index = Number(button.getAttribute("data-lock-index"));
      var chargeId = button.getAttribute("data-lock-id");

      button.disabled = true;

      window.TCGCFirebase.setChargeLock({
        council: COUNCIL,
        studentId: studentId,
        index: isNaN(index) ? undefined : index,
        chargeId: chargeId || undefined,
        locked: !currentlyLocked
      })
        .then(function () {
          if (api.toast) {
            api.toast(
              "Payment " + (currentlyLocked ? "unlocked" : "locked"),
              (currentlyLocked
                ? "The charge is editable again."
                : "The charge is now frozen."),
              "success"
            );
          }
          load();
        })
        .catch(function (error) {
          console.warn("[payments] Lock update failed:", error);
          button.disabled = false;
          if (api.toast) {
            api.toast(
              "Couldn't update the charge",
              "Check your session and Firestore rules.",
              "error"
            );
          }
        });
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

  function openDialog(record) {
    if (!dialog || !record) return;

    activeRecord = record;

    if (studentEl) {
      studentEl.textContent =
        (record.name || "Student") + " · " + record.studentId;
    }

    loadTypes();
    if (typeSelect) typeSelect.value = "";
    if (amountInput) amountInput.value = "";
    if (dateInput) {
      dateInput.value = new Date().toISOString().slice(0, 10);
    }
    if (refInput) refInput.value = "";

    setError("");
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "open");

    window.setTimeout(function () {
      if (typeSelect) typeSelect.focus();
    }, 60);
  }

  if (typeSelect) {
    typeSelect.addEventListener("change", function () {
      var type = types.filter(function (item) {
        return item.id === typeSelect.value;
      })[0];
      if (type && amountInput) {
        amountInput.value = Number(type.amount || 0)
          ? Number(type.amount).toFixed(2)
          : "";
      }
    });
  }

  window.TCGCStartPayment = function (studentId, name) {
    if (!COUNCIL) return;

    var existing = recordFor(studentId);
    if (existing) {
      if (!existing.name && name) existing.name = name;
      openDialog(existing);
      return;
    }

    if (!window.TCGCFirebase || !window.TCGCFirebase.findPaymentRecord) return;

    window.TCGCFirebase.findPaymentRecord(studentId, COUNCIL)
      .then(function (found) {
        if (!found) {
          found = {
            council: COUNCIL,
            studentId: studentId,
            name: name || "",
            charges: [],
            payments: []
          };
        }
        if (!found.name && name) found.name = name;
        openDialog(found);
      })
      .catch(function (error) {
        console.warn("[payments] Could not load the student's record:", error);
      });
  };

  if (form) {
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      if (!activeRecord) return;

      var amount = Number(amountInput.value);
      var date = dateInput.value;
      var ref = refInput.value.trim();
      var type = types.filter(function (item) {
        return typeSelect && item.id === typeSelect.value;
      })[0];

      if (!type) {
        setError("Select a payment type.");
        if (typeSelect) typeSelect.focus();
        return;
      }
      if (type.locked) {
        setError(
          "This payment type is locked. Unlock it in Payment Types before recording."
        );
        if (typeSelect) typeSelect.focus();
        return;
      }
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

      window.TCGCFirebase.recordTypedPayment({
        council: COUNCIL,
        studentId: studentId,
        type: type,
        amount: amount,
        date: date,
        ref: ref,
        method: "",
        officer: {
          name: session && session.name ? session.name : "",
          position: session && session.position ? session.position : "",
          studentId: session && session.studentId ? session.studentId : ""
        }
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
          if (error && error.code === "locked-type") {
            setError(
              "This payment type is locked. Unlock it in Payment Types before recording."
            );
          } else if (error && error.code === "locked") {
            setError("All open charges for this student are locked.");
          } else {
            setError(
              "Couldn't save the payment. Check your session and Firestore rules, then try again."
            );
          }
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
