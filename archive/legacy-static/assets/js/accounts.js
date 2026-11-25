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

  var users = api.getUsers();

  if (api.DEMO_ACCOUNT) {
    var demoId = api.normalizeStudentId(api.DEMO_ACCOUNT.studentId);
    var hasDemo = users.some(function (user) {
      return api.normalizeStudentId(user.studentId) === demoId;
    });
    if (!hasDemo) {
      users = users.concat([api.DEMO_ACCOUNT]);
    }
  }

  users.sort(function (a, b) {
    return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
  });

  if (count) {
    count.textContent = users.length + (users.length === 1 ? " account" : " accounts");
  }

  if (!users.length) {
    body.innerHTML = "";
    if (empty) empty.hidden = false;
    return;
  }

  if (empty) empty.hidden = true;

  body.innerHTML = users.map(function (user) {
    return (
      "<tr>" +
        '<td class="cell-name">' + cell(user.name) + "</td>" +
        "<td>" + cell(user.studentId) + "</td>" +
        '<td class="cell-position">' + cell(user.position) + "</td>" +
        "<td>" + cell(user.yearLevel) + "</td>" +
        "<td>" + cell(user.institute) + "</td>" +
        "<td>" + cell(user.program) + "</td>" +
      "</tr>"
    );
  }).join("");
})();
