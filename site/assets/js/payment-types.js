/* =========================================================
   TCGC PayTrack — payment types tab
   ========================================================= */

(function () {
  "use strict";

  var api = window.TCGC;
  if (!api) return;

  var session = api.getSession ? api.getSession() : null;
  var COUNCIL = session && session.council ? api.normalizeCouncil(session.council) : "";

  var form = document.getElementById("payment-type-form");
  var semesterSelect = document.getElementById("type-semester");
  var academicYearInput = document.getElementById("type-academic-year");
  var nameInput = document.getElementById("payment-type-name");
  var amountInput = document.getElementById("payment-type-amount");
  var hint = document.getElementById("payment-hint");
  var body = document.getElementById("payment-types-body");
  var tableWrap = document.getElementById("payment-types-table-wrap");
  var empty = document.getElementById("payment-types-empty");

  /*
   * Maintain the semester list here. Add another value and redeploy the site;
   * the dropdown is generated from this array.
   */
  var SEMESTERS = ["1ST SEMESTER", "2ND SEMESTER"];

  var dialog = document.getElementById("payment-type-dialog");
  var editForm = document.getElementById("payment-type-edit-form");
  var editName = document.getElementById("edit-payment-type-name");
  var editAmount = document.getElementById("edit-payment-type-amount");
  var editError = document.getElementById("payment-type-edit-error");
  var editClose = document.getElementById("payment-type-dialog-close");
  var editCancel = document.getElementById("payment-type-edit-cancel");

  var newButton = document.getElementById("new-payment-type");
  var createDialog = document.getElementById("new-payment-type-dialog");
  var createClose = document.getElementById("new-payment-type-close");
  var createCancel = document.getElementById("new-payment-type-cancel");

  if (!form || !body) return;

  var types = [];
  var editingType = null;

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

  function actionIcon(name) {
    var paths = {
      edit:
        '<path d="M12 20h9" />' +
        '<path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />',
      delete:
        '<path d="M3 6h18" />' +
        '<path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" />' +
        '<path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />' +
        '<path d="M10 11v6M14 11v6" />',
      lock:
        '<rect x="4" y="10" width="16" height="10" rx="2" />' +
        '<path d="M8 10V7a4 4 0 0 1 8 0v3" />',
      unlock:
        '<rect x="4" y="10" width="16" height="10" rx="2" />' +
        '<path d="M8 10V7a4 4 0 0 1 7-2" />'
    };

    return (
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
      'stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ' +
      'aria-hidden="true">' +
      paths[name] +
      "</svg>"
    );
  }

  function setHint(message, tone) {
    if (!hint) return;
    hint.textContent = message || "";
    hint.setAttribute("data-state", tone || "");
  }

  function fillSemesters() {
    if (!semesterSelect) return;

    semesterSelect.innerHTML =
      '<option value="" disabled selected>Select semester</option>' +
      SEMESTERS.map(function (semester) {
        return '<option value="' + esc(semester) + '">' + esc(semester) + "</option>";
      }).join("");
  }

  function openCreateDialog() {
    if (!createDialog) return;

    setHint("");
    if (nameInput) nameInput.value = "";
    if (amountInput) amountInput.value = "";

    if (typeof createDialog.showModal === "function") createDialog.showModal();
    else createDialog.setAttribute("open", "open");

    window.setTimeout(function () {
      if (nameInput) nameInput.focus();
    }, 60);
  }

  function closeCreateDialog() {
    if (!createDialog) return;
    if (typeof createDialog.close === "function") createDialog.close();
    else createDialog.removeAttribute("open");
  }

  fillSemesters();

  function render() {
    if (!types.length) {
      body.innerHTML = "";
      if (tableWrap) tableWrap.hidden = true;
      if (empty) empty.hidden = false;
      return;
    }

    if (empty) empty.hidden = true;
    if (tableWrap) tableWrap.hidden = false;

    body.innerHTML = types
      .map(function (type) {
        var locked = Boolean(type.locked);

        return (
          "<tr>" +
          '<td class="cell-name">' + esc(type.label || type.name || "Payment") + "</td>" +
          '<td class="num">' + money(type.amount) + "</td>" +
          '<td><span class="pay-status ' +
          (locked ? "pay-status--due" : "pay-status--paid") +
          '">' +
          (locked ? "Locked" : "Unlocked") +
          "</span></td>" +
          '<td class="cell-actions">' +
          '<span class="row-actions">' +
          '<button class="row-action' +
          (locked ? "" : " row-action--danger") +
          '" type="button" data-action="lock" data-id="' +
          esc(type.id) +
          '" data-locked="' +
          (locked ? "true" : "false") +
          '">' +
          actionIcon(locked ? "unlock" : "lock") +
          "<span>" +
          (locked ? "Unlock" : "Lock") +
          "</span></button>" +
          '<button class="row-action" type="button" data-action="edit" data-id="' +
          esc(type.id) +
          '" aria-label="Edit ' +
          esc(type.name || type.label || "payment type") +
          '">' +
          actionIcon("edit") +
          "<span>Edit</span></button>" +
          '<button class="row-action row-action--danger" type="button" data-action="delete" data-id="' +
          esc(type.id) +
          '" aria-label="Delete ' +
          esc(type.name || type.label || "payment type") +
          '">' +
          actionIcon("delete") +
          "<span>Delete</span></button>" +
          "</span>" +
          "</td>" +
          "</tr>"
        );
      })
      .join("");
  }

  function load() {
    if (!COUNCIL) {
      types = [];
      render();
      setHint("Your account has no Council/Organization assigned.", "error");
      return;
    }

    if (!window.TCGCFirebase || !window.TCGCFirebase.listPaymentTypes) {
      return;
    }

    window.TCGCFirebase.listPaymentTypes(COUNCIL)
      .then(function (rows) {
        types = rows || [];
        render();
      })
      .catch(function (error) {
        console.warn("[payment-types] Could not load payment types:", error);
        setHint("Couldn't load payment types. Check your connection and rules.", "error");
      });
  }

  form.addEventListener("submit", function (event) {
    event.preventDefault();

    var semester = semesterSelect ? semesterSelect.value : "";
    var academicYear = academicYearInput
      ? academicYearInput.value.trim()
      : "";
    var name = nameInput ? nameInput.value.trim().toUpperCase() : "";
    var amount = amountInput ? Number(amountInput.value) : 0;

    if (!COUNCIL) {
      setHint("Your account has no Council/Organization assigned.", "error");
      return;
    }
    if (!semester) {
      setHint("Select the semester.", "error");
      if (semesterSelect) semesterSelect.focus();
      return;
    }
    if (!/^\d{4}\s*-\s*\d{4}$/.test(academicYear)) {
      setHint("Use an academic year like 2026-2027.", "error");
      if (academicYearInput) academicYearInput.focus();
      return;
    }
    if (!name) {
      setHint("Enter the payment type.", "error");
      if (nameInput) nameInput.focus();
      return;
    }
    if (!(amount > 0)) {
      setHint("Enter an amount greater than zero.", "error");
      if (amountInput) amountInput.focus();
      return;
    }

    var label = semester + " - " + academicYear + " | " + name;
    var submit = form.querySelector('button[type="submit"]');
    if (submit) submit.disabled = true;
    setHint("Creating " + label + "…");

    window.TCGCFirebase.createPaymentType({
      label: label,
      semester: semester,
      academicYear: academicYear,
      name: name,
      amount: amount,
      council: COUNCIL,
      createdAt: new Date().toISOString()
    })
      .then(function () {
        closeCreateDialog();
        setHint("Payment type created: " + label + " · " + money(amount), "success");
        if (api.toast) {
          api.toast(
            "Payment type created",
            label + " · " + money(amount),
            "success"
          );
        }
        if (nameInput) nameInput.value = "";
        if (amountInput) amountInput.value = "";
        load();
      })
      .catch(function (error) {
        console.warn("[payment-types] Create failed:", error);

        var code = error && error.code;

        if (code === "permission-denied") {
          setHint(
            "Firestore denied the write. Deploy the latest firestore.rules and make sure your profile has a council.",
            "error"
          );
        } else if (code === "auth") {
          setHint("Your session expired. Log out and log in again.", "error");
        } else {
          setHint(
            "Couldn't create the payment type. " +
              (error && error.message ? error.message : "Please try again."),
            "error"
          );
        }
      })
      .then(function () {
        if (submit) submit.disabled = false;
      });
  });

  function setEditError(message) {
    if (!editError) return;
    editError.textContent = message || "";
    editError.hidden = !message;
  }

  function closeEdit() {
    if (!dialog) return;
    if (typeof dialog.close === "function") dialog.close();
    else dialog.removeAttribute("open");
    editingType = null;
  }

  function openEdit(type) {
    if (!dialog || !type) return;

    editingType = type;
    if (editName) editName.value = type.name || type.label || "";
    if (editAmount) editAmount.value = Number(type.amount || 0).toFixed(2);
    setEditError("");

    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "open");

    window.setTimeout(function () {
      if (editName) editName.focus();
    }, 60);
  }

  if (editForm) {
    editForm.addEventListener("submit", function (event) {
      event.preventDefault();
      if (!editingType) return;

      var name = editName ? editName.value.trim().toUpperCase() : "";
      var amount = editAmount ? Number(editAmount.value) : 0;

      if (!name) {
        setEditError("Enter the payment type.");
        return;
      }
      if (!(amount > 0)) {
        setEditError("Enter an amount greater than zero.");
        return;
      }

      var submit = editForm.querySelector('button[type="submit"]');
      if (submit) submit.disabled = true;

      window.TCGCFirebase.updatePaymentType(editingType.id, {
        name: name,
        amount: amount
      })
        .then(function () {
          closeEdit();
          setHint("Payment type updated: " + name, "success");
          load();
        })
        .catch(function (error) {
          console.warn("[payment-types] Update failed:", error);
          setEditError("Couldn't update the payment type. Check your session and rules.");
        })
        .then(function () {
          if (submit) submit.disabled = false;
        });
    });
  }

  if (body) {
    body.addEventListener("click", function (event) {
      var button =
        event.target && event.target.closest
          ? event.target.closest("[data-action]")
          : null;
      if (!button) return;

      var action = button.getAttribute("data-action");
      var typeId = button.getAttribute("data-id");
      var type = types.filter(function (item) {
        return item.id === typeId;
      })[0];

      if (!type) return;

      if (action === "edit") {
        openEdit(type);
        return;
      }

      if (action === "delete") {
        if (!window.confirm("Delete payment type “" + (type.name || "this type") + "”?")) {
          return;
        }

        window.TCGCFirebase.deletePaymentType(typeId)
          .then(function () {
            setHint("Payment type deleted.", "success");
            load();
          })
          .catch(function (error) {
            console.warn("[payment-types] Delete failed:", error);
            setHint("Couldn't delete the payment type.", "error");
          });
        return;
      }

      if (action === "lock") {
        var locked = button.getAttribute("data-locked") === "true";
        button.disabled = true;

        window.TCGCFirebase.setPaymentTypeLock(typeId, !locked)
          .then(function () {
            setHint(locked ? "Payment type unlocked." : "Payment type locked.", "success");
            load();
          })
          .catch(function (error) {
            console.warn("[payment-types] Lock failed:", error);
            button.disabled = false;
            setHint("Couldn't update the payment type.", "error");
          });
      }
    });
  }

  if (editClose) editClose.addEventListener("click", closeEdit);
  if (editCancel) editCancel.addEventListener("click", closeEdit);
  if (dialog) {
    dialog.addEventListener("click", function (event) {
      if (event.target === dialog) closeEdit();
    });
    dialog.addEventListener("close", function () {
      editingType = null;
    });
  }

  if (newButton) newButton.addEventListener("click", openCreateDialog);
  if (createClose) createClose.addEventListener("click", closeCreateDialog);
  if (createCancel) createCancel.addEventListener("click", closeCreateDialog);
  if (createDialog) {
    createDialog.addEventListener("click", function (event) {
      if (event.target === createDialog) closeCreateDialog();
    });
  }

  window.TCGCRefreshPaymentTypes = load;
  load();
})();
