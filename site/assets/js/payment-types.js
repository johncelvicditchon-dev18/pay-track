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
  var nameInput = document.getElementById("payment-type-name");
  var amountInput = document.getElementById("payment-type-amount");
  var hint = document.getElementById("payment-hint");
  var body = document.getElementById("payment-types-body");
  var tableWrap = document.getElementById("payment-types-table-wrap");
  var empty = document.getElementById("payment-types-empty");

  if (!form || !body) return;

  var types = [];

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

  function setHint(message, tone) {
    if (!hint) return;
    hint.textContent = message || "";
    hint.setAttribute("data-state", tone || "");
  }

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
          '<td class="cell-name">' + esc(type.name || type.label || "Payment") + "</td>" +
          '<td class="num">' + money(type.amount) + "</td>" +
          '<td><span class="pay-status ' +
          (locked ? "pay-status--due" : "pay-status--paid") +
          '">' +
          (locked ? "Locked" : "Unlocked") +
          "</span></td>" +
          '<td class="cell-actions">' +
          '<button class="row-action' +
          (locked ? "" : " row-action--danger") +
          '" type="button" data-lock-type="' +
          esc(type.id) +
          '" data-lock-state="' +
          (locked ? "true" : "false") +
          '">' +
          (locked ? "Unlock" : "Lock") +
          "</button>" +
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

    var name = nameInput ? nameInput.value.trim().toUpperCase() : "";
    var amount = amountInput ? Number(amountInput.value) : 0;

    if (!COUNCIL) {
      setHint("Your account has no Council/Organization assigned.", "error");
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

    var submit = form.querySelector('button[type="submit"]');
    if (submit) submit.disabled = true;
    setHint("Creating " + name + "…");

    window.TCGCFirebase.createPaymentType({
      label: name,
      name: name,
      amount: amount,
      council: COUNCIL,
      createdAt: new Date().toISOString()
    })
      .then(function () {
        setHint("Payment type created: " + name + " · " + money(amount), "success");
        if (nameInput) nameInput.value = "";
        if (amountInput) amountInput.value = "";
        load();
      })
      .catch(function (error) {
        console.warn("[payment-types] Create failed:", error);
        setHint("Couldn't create the payment type. Check your session and rules.", "error");
      })
      .then(function () {
        if (submit) submit.disabled = false;
      });
  });

  if (body) {
    body.addEventListener("click", function (event) {
      var button =
        event.target && event.target.closest
          ? event.target.closest("[data-lock-type]")
          : null;
      if (!button) return;

      var typeId = button.getAttribute("data-lock-type");
      var locked = button.getAttribute("data-lock-state") === "true";

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
    });
  }

  window.TCGCRefreshPaymentTypes = load;
  load();
})();
