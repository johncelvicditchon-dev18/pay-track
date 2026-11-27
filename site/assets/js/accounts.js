/* =========================================================
   TCGC PayTrack — accounts dashboard
   Reads the accounts created through the sign-up page and
   renders them in the column order of the sign-up form.
   ========================================================= */

(function () {
  "use strict";

  var api = window.TCGC;
  var body = document.getElementById("accounts-body");
  var empty = document.getElementById("accounts-empty");
  var count = document.getElementById("accounts-count");

  function actionIcon(name) {
    var paths = {
      edit:
        '<path d="M12 20h9" />' +
        '<path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />',
      delete:
        '<path d="M3 6h18" />' +
        '<path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" />' +
        '<path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />' +
        '<path d="M10 11v6M14 11v6" />'
    };

    return (
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
      'stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ' +
      'aria-hidden="true">' +
      paths[name] +
      "</svg>"
    );
  }

  var dialog = document.getElementById("account-dialog");
  var form = document.getElementById("account-form");
  var errorEl = document.getElementById("account-form-error");
  var closeButton = document.getElementById("account-dialog-close");
  var cancelButton = document.getElementById("account-form-cancel");

  var fields = {
    name: document.getElementById("edit-account-name"),
    studentId: document.getElementById("edit-account-student-id"),
    position: document.getElementById("edit-account-position"),
    yearLevel: document.getElementById("edit-account-year"),
    council: document.getElementById("edit-account-council")
  };

  var editingId = null;
  var remoteUsers = [];

  if (!api || !body) return;

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function cell(value) {
    var text = String(value == null ? "" : value).trim();
    return text ? escapeHtml(text) : "—";
  }

  function currentId() {
    var session = api.getSession ? api.getSession() : null;
    return session ? api.normalizeStudentId(session.studentId) : "";
  }

  function findStoredAccount(studentId) {
    var needle = api.normalizeStudentId(studentId);
    var match = null;

    api.getUsers().forEach(function (user) {
      if (!match && api.normalizeStudentId(user.studentId) === needle) {
        match = user;
      }
    });

    return match;
  }

  function render() {
    var users = api
      .getUsers()
      .filter(function (user) {
        return COUNCIL && api.normalizeCouncil(user.council) === COUNCIL;
      })
      .map(function (user) {
        return Object.assign({}, user);
      });

    remoteUsers
      .filter(function (user) {
        return COUNCIL && api.normalizeCouncil(user.council) === COUNCIL;
      })
      .forEach(function (remote) {
      var remoteId = api.normalizeStudentId(remote.studentId);
      var index = -1;

      users.forEach(function (user, i) {
        if (api.normalizeStudentId(user.studentId) === remoteId) index = i;
      });

      var synced = Object.assign({}, remote, { __remote: true });
      if (index === -1) users.push(synced);
      else users[index] = synced;
    });

    users.sort(function (a, b) {
      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    });

    if (count) {
      count.textContent =
        users.length + (users.length === 1 ? " account" : " accounts");
    }

    if (!users.length) {
      body.innerHTML = "";
      if (empty) empty.hidden = false;
      return;
    }

    if (empty) empty.hidden = true;

    var sessionId = currentId();

    body.innerHTML = users
      .map(function (user) {
        var id = api.normalizeStudentId(user.studentId);
        var isCurrent = sessionId && id === sessionId;
        var actions = user.__remote
          ? '<span class="row-note">Synced</span>'
          : '<span class="row-actions">' +
            '<button class="row-action" type="button" data-action="edit" data-id="' +
            escapeHtml(user.studentId) +
            '">' +
            actionIcon("edit") +
            "<span>Edit</span></button>" +
            '<button class="row-action row-action--danger" type="button" data-action="delete" data-id="' +
            escapeHtml(user.studentId) +
            '">' +
            actionIcon("delete") +
            "<span>Delete</span></button>" +
            "</span>";

        return (
          "<tr" +
          (isCurrent ? ' class="is-you"' : "") +
          ">" +
          '<td class="cell-name">' + cell(user.name) + "</td>" +
          "<td>" + cell(user.studentId) + "</td>" +
          '<td class="cell-position">' + cell(user.position) + "</td>" +
          "<td>" + cell(user.yearLevel) + "</td>" +
          "<td>" + cell(user.council) + "</td>" +
          '<td class="cell-actions">' + actions + "</td>" +
          "</tr>"
        );
      })
      .join("");
  }

  /* ---------- edit dialog ---------- */
  function setError(message) {
    if (!errorEl) return;
    errorEl.textContent = message || "";
    errorEl.hidden = !message;
  }

  function closeDialog() {
    if (!dialog) return;
    if (typeof dialog.close === "function") dialog.close();
    else dialog.removeAttribute("open");
    editingId = null;
  }

  function uppercaseField(input) {
    if (!input) return;

    input.addEventListener("input", function () {
      var start = input.selectionStart;
      var end = input.selectionEnd;
      input.value = input.value.toUpperCase();
      if (start !== null) input.setSelectionRange(start, end);
    });
  }

  function openDialog(studentId) {
    var user = findStoredAccount(studentId);
    if (!user || !dialog || !form) return;

    editingId = api.normalizeStudentId(user.studentId);
    fields.name.value = user.name || "";
    fields.studentId.value = user.studentId || "";
    fields.position.value = user.position || "";
    fields.yearLevel.value = user.yearLevel || "";
    if (fields.council) fields.council.value = user.council || "";

    setError("");
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "open");

    window.setTimeout(function () {
      fields.name.focus();
      if (fields.name.select) fields.name.select();
    }, 60);
  }

  function handleSave(event) {
    event.preventDefault();
    if (!editingId) return;

    var name = fields.name.value.trim().toUpperCase();
    var studentId = api.normalizeStudentId(fields.studentId.value);
    var position = fields.position.value.trim().toUpperCase();
    var yearLevel = fields.yearLevel.value.trim();
    var council = fields.council ? fields.council.value.trim() : "";

    if (!name || !studentId || !position || !yearLevel || !council) {
      setError("Fill in every field before saving.");
      return;
    }

    var users = api.getUsers();
    var duplicate = users.some(function (user) {
      var id = api.normalizeStudentId(user.studentId);
      return id === studentId && id !== editingId;
    });

    if (duplicate) {
      setError("Another account already uses that Student ID.");
      fields.studentId.focus();
      return;
    }

    var index = -1;
    users.forEach(function (user, i) {
      if (api.normalizeStudentId(user.studentId) === editingId) index = i;
    });

    if (index === -1) {
      setError("That account no longer exists. Refresh the page.");
      return;
    }

    var oldId = editingId;
    users[index] = Object.assign({}, users[index], {
      name: name,
      studentId: studentId,
      position: position,
      yearLevel: yearLevel,
      council: api.normalizeCouncil(council)
    });

    api.saveUsers(users);

    var session = api.getSession ? api.getSession() : null;
    var isCurrent = session && api.normalizeStudentId(session.studentId) === oldId;

    if (isCurrent && api.updateSession) {
      api.updateSession({
        name: name,
        studentId: studentId,
        position: position,
        yearLevel: yearLevel,
        council: api.normalizeCouncil(council)
      });
      closeDialog();
      api.toast(
        "Account updated",
        "Your account details were saved. Refreshing…",
        "success"
      );
      window.setTimeout(function () {
        window.location.reload();
      }, 700);
      return;
    }

    render();
    closeDialog();
    api.toast("Account updated", "The account details were saved.", "success");
  }

  function handleDelete(studentId) {
    var user = findStoredAccount(studentId);
    if (!user) return;

    var label =
      (user.name || "this account") + " (" + user.studentId + ")";
    if (!window.confirm("Delete " + label + "?")) return;

    var remaining = api.getUsers().filter(function (entry) {
      return api.normalizeStudentId(entry.studentId) !== api.normalizeStudentId(user.studentId);
    });

    api.saveUsers(remaining);

    var session = api.getSession ? api.getSession() : null;
    var isCurrent =
      session &&
      api.normalizeStudentId(session.studentId) ===
        api.normalizeStudentId(user.studentId);

    if (isCurrent) {
      api.clearSession();
      api.toast(
        "Account deleted",
        "Your account was removed. Redirecting to login…",
        "info"
      );
      window.setTimeout(function () {
        window.location.href = "login.html";
      }, 700);
      return;
    }

    render();
    api.toast("Account deleted", "The account was removed.", "info");
  }

  /* ---------- events ---------- */
  if (body) {
    body.addEventListener("click", function (event) {
      var button =
        event.target && event.target.closest
          ? event.target.closest("[data-action]")
          : null;
      if (!button) return;

      var studentId = button.getAttribute("data-id");
      var action = button.getAttribute("data-action");

      if (action === "edit") openDialog(studentId);
      else if (action === "delete") handleDelete(studentId);
    });
  }

  if (form) form.addEventListener("submit", handleSave);
  if (closeButton) closeButton.addEventListener("click", closeDialog);
  if (cancelButton) cancelButton.addEventListener("click", closeDialog);
  if (dialog) {
    dialog.addEventListener("click", function (event) {
      if (event.target === dialog) closeDialog();
    });
    dialog.addEventListener("close", function () {
      editingId = null;
    });
  }

  uppercaseField(fields.name);
  uppercaseField(fields.studentId);
  uppercaseField(fields.position);

  function loadRemote() {
    var session = api.getSession ? api.getSession() : null;

    if (!session || !session.idToken) return;
    if (!window.TCGCFirebase || !window.TCGCFirebase.listUserAccounts) return;

    window.TCGCFirebase.listUserAccounts(session.idToken)
      .then(function (rows) {
        remoteUsers = rows || [];
        render();
      })
      .catch(function (error) {
        console.warn("[accounts] Could not load Firebase accounts:", error);
      });
  }

  render();
  loadRemote();
})();
