/* =========================================================
   TCGC PayTrack — student dashboard
   Collapsible navigation + tab switching + session details
   ========================================================= */

(function () {
  "use strict";

  var api = window.TCGC;
  if (!api) return;

  var session = api.getSession ? api.getSession() : null;

  // Every dashboard belongs to a signed-in user.
  if (!session) {
    var hashView = String(window.location.hash || "").replace(/^#/, "");
    var nextView =
      hashView === "accounts" || hashView === "students" ? hashView : "dashboard";
    window.location.replace("login.html?next=" + nextView);
    return;
  }

  var NAV_KEY = "tcgc_paytrack_nav";
  var shell = document.getElementById("dash-shell");
  var sideNav = document.getElementById("side-nav");
  var scrim = document.getElementById("side-scrim");
  var navToggle = document.getElementById("nav-toggle");
  var navClose = document.getElementById("side-close");
  var mobileQuery = window.matchMedia("(max-width: 920px)");

  function isMobile() {
    return mobileQuery.matches;
  }

  function setToggleState(open) {
    if (!navToggle) return;
    navToggle.setAttribute("aria-expanded", String(open));
    navToggle.setAttribute("aria-label", open ? "Hide navigation" : "Show navigation");
  }

  /* ---------- mobile off-canvas ---------- */
  function openMobileNav() {
    if (!shell) return;
    shell.classList.add("is-nav-open");
    if (scrim) scrim.hidden = false;
    document.body.classList.add("nav-open-lock");
    setToggleState(true);
  }

  function closeMobileNav() {
    if (!shell) return;
    shell.classList.remove("is-nav-open");
    if (scrim) scrim.hidden = true;
    document.body.classList.remove("nav-open-lock");
    if (isMobile()) setToggleState(false);
  }

  /* ---------- desktop collapse ---------- */
  function applyDesktopState() {
    if (!shell) return;

    var closed = false;
    try {
      closed = window.localStorage.getItem(NAV_KEY) === "closed";
    } catch (err) {
      closed = false;
    }

    shell.classList.toggle("is-nav-closed", closed);
    setToggleState(!closed);
  }

  function setDesktopOpen(open) {
    if (!shell) return;

    try {
      window.localStorage.setItem(NAV_KEY, open ? "open" : "closed");
    } catch (err) {
      /* private mode — ignore */
    }

    shell.classList.toggle("is-nav-closed", !open);
    setToggleState(open);
  }

  function syncNavForViewport() {
    if (isMobile()) {
      if (shell) shell.classList.remove("is-nav-closed");
      closeMobileNav();
      return;
    }

    closeMobileNav();
    if (scrim) scrim.hidden = true;
    applyDesktopState();
  }

  if (navToggle) {
    navToggle.addEventListener("click", function () {
      if (isMobile()) {
        if (shell && shell.classList.contains("is-nav-open")) {
          closeMobileNav();
        } else {
          openMobileNav();
        }
        return;
      }

      setDesktopOpen(shell ? shell.classList.contains("is-nav-closed") : true);
    });
  }

  if (navClose) {
    navClose.addEventListener("click", function () {
      if (isMobile()) closeMobileNav();
      else setDesktopOpen(false);
    });
  }

  if (scrim) {
    scrim.addEventListener("click", closeMobileNav);
  }

  document.addEventListener("keydown", function (event) {
    if (event.key !== "Escape") return;
    if (isMobile() && shell && shell.classList.contains("is-nav-open")) {
      closeMobileNav();
    }
  });

  if (mobileQuery.addEventListener) {
    mobileQuery.addEventListener("change", syncNavForViewport);
  } else if (mobileQuery.addListener) {
    mobileQuery.addListener(syncNavForViewport);
  }

  syncNavForViewport();

  /* ---------- tabs ---------- */
  var VIEW_TITLES = {
    dashboard: "Dashboard",
    students: "Students",
    accounts: "Accounts"
  };

  var viewLinks = document.querySelectorAll("[data-view]");
  var viewPanels = document.querySelectorAll("[data-view-panel]");
  var topbarTitle = document.getElementById("topbar-title");

  function currentView() {
    var name = String(window.location.hash || "").replace(/^#/, "");
    return VIEW_TITLES[name] ? name : "dashboard";
  }

  function showView(name) {
    Array.prototype.forEach.call(viewPanels, function (panel) {
      panel.hidden = panel.getAttribute("data-view-panel") !== name;
    });

    Array.prototype.forEach.call(viewLinks, function (link) {
      var active = link.getAttribute("data-view") === name;
      link.classList.toggle("is-active", active);

      if (link.tagName === "A") {
        if (active) link.setAttribute("aria-current", "page");
        else link.removeAttribute("aria-current");
      }
    });

    if (topbarTitle) topbarTitle.textContent = VIEW_TITLES[name];
    document.title = VIEW_TITLES[name] + " · TCGC PayTrack";

    if (isMobile()) closeMobileNav();
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }

  Array.prototype.forEach.call(viewLinks, function (link) {
    link.addEventListener("click", function (event) {
      event.preventDefault();

      var name = link.getAttribute("data-view");
      if (!VIEW_TITLES[name]) return;

      if (currentView() === name) {
        showView(name);
        if (window.history.replaceState) {
          window.history.replaceState({}, document.title, "#" + name);
        }
        return;
      }

      window.location.hash = name;
    });
  });

  window.addEventListener("hashchange", function () {
    showView(currentView());
  });

  showView(currentView());

  /* ---------- session details ---------- */
  function textOrDash(value) {
    var text = String(value == null ? "" : value).trim();
    return text || "—";
  }

  Array.prototype.forEach.call(
    document.querySelectorAll("[data-session]"),
    function (element) {
      var key = element.getAttribute("data-session");
      element.textContent = textOrDash(session[key]);
    }
  );

  var firstName = String(session.name || "Student").trim().split(/\s+/)[0];
  Array.prototype.forEach.call(
    document.querySelectorAll("[data-session-firstname]"),
    function (element) {
      element.textContent = firstName;
    }
  );

  var initials = api.initials(session.name) || "S";
  Array.prototype.forEach.call(
    document.querySelectorAll("[data-session-initials]"),
    function (element) {
      element.textContent = initials;
    }
  );

  /* ---------- highlight your own row in the accounts table ---------- */
  var accountsBody = document.getElementById("accounts-body");
  if (accountsBody) {
    var ownId = api.normalizeStudentId(session.studentId);

    Array.prototype.forEach.call(
      accountsBody.querySelectorAll("tr"),
      function (row) {
        var idCell = row.children[1];
        if (!idCell) return;

        if (ownId && api.normalizeStudentId(idCell.textContent) === ownId) {
          row.classList.add("is-you");
          row.title = "This is your account";
        }
      }
    );
  }

  /* ---------- logout ---------- */
  var logoutButton = document.getElementById("dash-logout");
  if (logoutButton) {
    logoutButton.addEventListener("click", function () {
      api.clearSession();
      api.toast("Signed out", "You have been logged out of PayTrack.", "info");

      window.setTimeout(function () {
        window.location.href = "../index.html";
      }, 650);
    });
  }

  // Keep the sidebar accessible if the viewport rotates while it is open.
  if (sideNav) {
    sideNav.addEventListener("transitionend", function () {
      if (!isMobile()) document.body.classList.remove("nav-open-lock");
    });
  }
})();
