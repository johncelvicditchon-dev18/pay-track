/* =========================================================
   TCGC PayTrack — welcome page behaviour
   ========================================================= */

(function () {
  "use strict";

  var header = document.getElementById("site-header");
  var nav = document.getElementById("primary-nav");
  var navToggle = document.querySelector(".nav-toggle");
  var headerActions = document.getElementById("header-actions");
  var yearEl = document.getElementById("year");
  var api = window.TCGC;

  if (yearEl) {
    yearEl.textContent = String(new Date().getFullYear());
  }

  /* ---------- header on scroll ---------- */
  function onScroll() {
    if (!header) return;
    header.classList.toggle("is-scrolled", window.scrollY > 24);
  }

  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  /* ---------- mobile navigation ---------- */
  function setNav(open) {
    if (!nav || !navToggle) return;
    nav.classList.toggle("is-open", open);
    navToggle.setAttribute("aria-expanded", String(open));
    navToggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  }

  if (navToggle && nav) {
    navToggle.addEventListener("click", function () {
      setNav(!nav.classList.contains("is-open"));
    });

    nav.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        setNav(false);
      });
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        setNav(false);
      }
    });

    document.addEventListener("click", function (event) {
      if (!nav.classList.contains("is-open")) return;
      if (nav.contains(event.target) || navToggle.contains(event.target)) return;
      setNav(false);
    });

    window.addEventListener("resize", function () {
      if (window.innerWidth > 920) {
        setNav(false);
      }
    });
  }

  /* ---------- signed-in header state ---------- */
  function renderSession() {
    var session = api && api.getSession ? api.getSession() : null;
    if (!session || !headerActions) return;

    var loginLink = headerActions.querySelector(".header-login");
    var signupBtn = headerActions.querySelector(".btn");
    var navAuth = document.querySelector(".nav-auth");
    var navLogin = document.querySelector(".nav-login");
    var firstName = String(session.name || "Student").trim().split(/\s+/)[0];

    if (loginLink) loginLink.hidden = true;
    if (signupBtn) signupBtn.hidden = true;
    if (navAuth) navAuth.hidden = true;
    if (navLogin) navLogin.hidden = true;

    var dashboardLink = document.createElement("a");
    dashboardLink.className = "header-dashboard";
    dashboardLink.href = "pages/dashboard.html";
    dashboardLink.textContent = "Dashboard";
    headerActions.insertBefore(dashboardLink, navToggle || null);

    if (nav) {
      var navDashboard = document.createElement("a");
      navDashboard.className = "nav-dashboard";
      navDashboard.href = "pages/dashboard.html";
      navDashboard.textContent = "Dashboard";
      navDashboard.addEventListener("click", function () {
        setNav(false);
      });
      nav.insertBefore(navDashboard, nav.firstChild);
    }

    var chip = document.createElement("span");
    chip.className = "header-user";
    chip.title = session.studentId || "";

    var avatar = document.createElement("span");
    avatar.className = "avatar";
    avatar.setAttribute("aria-hidden", "true");
    avatar.textContent = api.initials(session.name) || "S";

    var hello = document.createElement("span");
    hello.textContent = "Hi, " + firstName;

    chip.appendChild(avatar);
    chip.appendChild(hello);

    var logout = document.createElement("button");
    logout.type = "button";
    logout.className = "header-logout";
    logout.textContent = "Log out";

    headerActions.insertBefore(chip, navToggle || null);
    headerActions.insertBefore(logout, navToggle || null);

    logout.addEventListener("click", function () {
      api.clearSession();
      api.toast("Signed out", "You have been logged out of PayTrack.", "info");
      window.setTimeout(function () {
        window.location.reload();
      }, 600);
    });
  }

  renderSession();

  /* ---------- welcome-back toast after login ---------- */
  var params = new URLSearchParams(window.location.search);
  if (params.get("welcome") === "1" && api) {
    var session = api.getSession();
    if (session) {
      api.toast(
        "Welcome back, " + String(session.name || "student").trim().split(/\s+/)[0] + "!",
        "You are signed in. Your account is ready for this semester.",
        "success"
      );
    }
    if (window.history.replaceState) {
      window.history.replaceState({}, document.title, window.location.pathname + window.location.hash);
    }
  }
})();
