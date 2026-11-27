/* =========================================================
   TCGC PayTrack — shared UI + storage helpers
   ========================================================= */

(function () {
  "use strict";

  var USERS_KEY = "tcgc_paytrack_users";
  var SESSION_KEY = "tcgc_paytrack_session";
  var memory = Object.create(null);

  var COUNCILS = [
    "ISC-ICS",
    "ISC-IAS",
    "ISC-IHS",
    "ISC-ITE",
    "ISC-IBFS",
    "ISC-ICJE",
    "SRO-JPEG.COM",
    "SRO-ISMTSU",
    "SRO-VOSS",
    "SRO-CITU",
    "SRO-AYOA",
    "SRO-GLEE-C",
    "SRO-PSC",
    "SRO-YLS",
    "SRO-JEHRO",
    "SRO-TMS-FIL",
    "SRO-JFINEX",
    "SRO-COMMUNITY",
    "SRO-GAME",
    "SRO-CRCYC",
    "SRO-TEEM",
    "SRO-JAMEX"
  ];

  /* Positions offered by each council type. Add or edit here to maintain. */
  var ISC_POSITIONS = [
    "GOVERNOR",
    "VICE-GOVERNOR",
    "SECRETARY",
    "TREASURER",
    "AUDITOR",
    "BM ACADEMIC AFFAIRS",
    "BM EXTERNAL AFFAIRS",
    "BM SPORT DEVELOPMENT",
    "BM SOCIO-CULTURAL",
    "BM ENVIRONMENTAL AFFAIRS"
  ];

  var SRO_POSITIONS = [
    "PRESIDENT",
    "VICE-PRESIDENT",
    "SECRETARY",
    "TREASURER",
    "AUDITOR",
    "1ST YEAR REPRESENTATIVE",
    "2ND YEAR REPRESENTATIVE",
    "3RD YEAR REPRESENTATIVE",
    "4TH YEAR REPRESENTATIVE"
  ];

  function positionsForCouncil(council) {
    var code = normalizeCouncil(council);
    if (code.indexOf("ISC-") === 0) return ISC_POSITIONS.slice();
    if (code.indexOf("SRO-") === 0) return SRO_POSITIONS.slice();
    return [];
  }

  /* ---------- storage (with in-memory fallback) ---------- */
  function readJSON(store, key, fallback) {
    try {
      var raw = store.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (err) {
      return memory[key] || fallback;
    }
  }

  function writeJSON(store, key, value) {
    try {
      store.setItem(key, JSON.stringify(value));
    } catch (err) {
      memory[key] = value;
    }
  }

  function removeKey(store, key) {
    try {
      store.removeItem(key);
    } catch (err) {
      delete memory[key];
    }
  }

  /* ---------- accounts ---------- */
  function getUsers() {
    var users = readJSON(window.localStorage, USERS_KEY, []);
    return Array.isArray(users) ? users : [];
  }

  function saveUsers(users) {
    writeJSON(window.localStorage, USERS_KEY, users);
  }

  function normalizeStudentId(value) {
    return String(value || "").trim().toUpperCase();
  }

  function normalizeCouncil(value) {
    return String(value || "").trim().toUpperCase();
  }

  function findUser(studentId) {
    var needle = normalizeStudentId(studentId);
    var match = null;

    if (!needle) return null;

    getUsers().forEach(function (user) {
      if (!match && user.studentId && normalizeStudentId(user.studentId) === needle) {
        match = user;
      }
    });

    return match;
  }

  /* ---------- session ---------- */
  function getSession() {
    var session = readJSON(window.localStorage, SESSION_KEY, null);
    if (!session) {
      session = readJSON(window.sessionStorage, SESSION_KEY, null);
    }
    return session && session.studentId ? session : null;
  }

  function setSession(session, remember) {
    clearSession();
    var store = remember ? window.localStorage : window.sessionStorage;
    writeJSON(store, SESSION_KEY, session);
  }

  function clearSession() {
    removeKey(window.localStorage, SESSION_KEY);
    removeKey(window.sessionStorage, SESSION_KEY);
  }

  function updateSession(updates) {
    var store = window.localStorage;
    var session = readJSON(store, SESSION_KEY, null);

    if (!session) {
      store = window.sessionStorage;
      session = readJSON(store, SESSION_KEY, null);
    }

    if (!session) return null;

    var next = {};
    Object.keys(session).forEach(function (key) {
      next[key] = session[key];
    });
    Object.keys(updates || {}).forEach(function (key) {
      next[key] = updates[key];
    });

    writeJSON(store, SESSION_KEY, next);
    return next;
  }

  function initials(name) {
    return String(name || "")
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map(function (part) {
        return part.charAt(0).toUpperCase();
      })
      .join("");
  }

  /* ---------- toast ---------- */
  var ICONS = {
    success:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="m8.5 12.2 2.3 2.3 4.7-4.9"/></svg>',
    error:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7.5v5M12 16.5h.01"/></svg>',
    info:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v5.5M12 7.6h.01"/></svg>'
  };

  function getToastStack() {
    var stack = document.querySelector(".toast-stack");
    if (!stack) {
      stack = document.createElement("div");
      stack.className = "toast-stack";
      stack.setAttribute("role", "status");
      stack.setAttribute("aria-live", "polite");
      document.body.appendChild(stack);
    }
    return stack;
  }

  function toast(title, message, type) {
    var kind = type || "info";
    var stack = getToastStack();

    var el = document.createElement("div");
    el.className = "toast toast--" + kind;

    var icon = document.createElement("span");
    icon.className = "toast__icon";
    icon.innerHTML = ICONS[kind] || ICONS.info;

    var body = document.createElement("div");
    body.className = "toast__body";

    var strong = document.createElement("strong");
    strong.textContent = title;
    body.appendChild(strong);

    if (message) {
      var copy = document.createElement("p");
      copy.textContent = message;
      body.appendChild(copy);
    }

    var close = document.createElement("button");
    close.className = "toast__close";
    close.type = "button";
    close.setAttribute("aria-label", "Dismiss notification");
    close.innerHTML = "&times;";

    el.appendChild(icon);
    el.appendChild(body);
    el.appendChild(close);
    stack.appendChild(el);

    var timer = null;

    function dismiss() {
      if (timer) {
        window.clearTimeout(timer);
      }
      el.classList.add("is-hiding");
      window.setTimeout(function () {
        if (el.parentNode) {
          el.parentNode.removeChild(el);
        }
      }, 240);
    }

    close.addEventListener("click", dismiss);
    timer = window.setTimeout(dismiss, 5500);

    return dismiss;
  }

  window.TCGC = {
    COUNCILS: COUNCILS,
    ISC_POSITIONS: ISC_POSITIONS,
    SRO_POSITIONS: SRO_POSITIONS,
    positionsForCouncil: positionsForCouncil,
    getUsers: getUsers,
    saveUsers: saveUsers,
    findUser: findUser,
    normalizeStudentId: normalizeStudentId,
    normalizeCouncil: normalizeCouncil,
    getSession: getSession,
    setSession: setSession,
    updateSession: updateSession,
    clearSession: clearSession,
    initials: initials,
    toast: toast
  };
})();
