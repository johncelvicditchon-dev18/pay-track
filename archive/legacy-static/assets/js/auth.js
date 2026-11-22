/* =========================================================
   TCGC PayTrack — login & sign-up logic
   Front-end demo only: accounts are stored in this browser's
   localStorage, never sent anywhere. Wire this to a real API
   and server-side password hashing before production use.
   ========================================================= */

(function () {
  "use strict";

  var api = window.TCGC;
  if (!api) return;

  var DEMO_ACCOUNT = {
    name: "Maria Santos",
    email: "student@tcgc.edu",
    password: "tcgc1234",
    studentId: "2024-00123",
    institute: "ICS",
    program: "BS Information Technology"
  };

  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  /* ---------- field error helpers ---------- */
  function fieldOf(input) {
    return input.closest(".field");
  }

  function showError(input, message) {
    var field = fieldOf(input);
    var error = field ? field.querySelector(".field-error") : null;

    if (field) {
      field.classList.add("has-error");
    }
    if (error) {
      error.textContent = message;
      error.hidden = false;
    }
    input.setAttribute("aria-invalid", "true");
  }

  function clearError(input) {
    var field = fieldOf(input);
    var error = field ? field.querySelector(".field-error") : null;

    if (field) {
      field.classList.remove("has-error");
    }
    if (error) {
      error.textContent = "";
      error.hidden = true;
    }
    input.removeAttribute("aria-invalid");
  }

  function attachClearHandlers(form) {
    form.querySelectorAll("input, select").forEach(function (input) {
      input.addEventListener("input", function () {
        clearError(input);
      });
      input.addEventListener("change", function () {
        clearError(input);
      });
    });
  }

  function focusFirst(invalid) {
    if (invalid.length) {
      invalid[0].focus();
    }
  }

  /* ---------- password visibility ---------- */
  document.querySelectorAll("[data-toggle-password]").forEach(function (button) {
    button.addEventListener("click", function () {
      var input = document.getElementById(button.getAttribute("data-toggle-password"));
      if (!input) return;

      var reveal = input.type === "password";
      input.type = reveal ? "text" : "password";
      button.setAttribute("aria-label", reveal ? "Hide password" : "Show password");
      button.setAttribute("aria-pressed", String(reveal));

      var eye = button.querySelector(".icon-eye");
      var eyeOff = button.querySelector(".icon-eye-off");
      if (eye) eye.hidden = reveal;
      if (eyeOff) eyeOff.hidden = !reveal;

      input.focus({ preventScroll: true });
    });
  });

  /* ---------- button loading state ---------- */
  function setLoading(button, loading, label) {
    if (!button) return;

    if (loading) {
      button.dataset.label = button.textContent.trim();
      button.disabled = true;
      button.textContent = "";

      var spinner = document.createElement("span");
      spinner.className = "spinner";
      button.appendChild(spinner);
      button.appendChild(document.createTextNode(label || "Please wait…"));
    } else {
      button.disabled = false;
      button.textContent = button.dataset.label || "Submit";
    }
  }

  /* ---------- password strength ---------- */
  function scorePassword(value) {
    var score = 0;
    if (value.length >= 8) score += 1;
    if (value.length >= 12) score += 1;
    if (/[a-z]/.test(value) && /[A-Z]/.test(value)) score += 1;
    if (/[^A-Za-z0-9]/.test(value) || (/\d/.test(value) && value.length >= 10)) score += 1;
    return Math.min(score, 4);
  }

  var STRENGTH_TEXT = [
    "Use 8+ characters with letters and numbers.",
    "Weak — make it longer and less predictable.",
    "Fair — mix letters, numbers, and capitals.",
    "Good — add a symbol for extra strength.",
    "Strong password. Nicely done."
  ];

  /* ---------- redirect helper ---------- */
  function redirectSoon(url, delay) {
    window.setTimeout(function () {
      window.location.href = url;
    }, delay || 900);
  }

  /* =========================================================
     LOGIN PAGE
     ========================================================= */
  var loginForm = document.getElementById("login-form");

  if (loginForm) {
    var loginEmail = document.getElementById("login-email");
    var loginPassword = document.getElementById("login-password");
    var loginRemember = document.getElementById("remember-me");
    var loginSubmit = document.getElementById("login-submit");
    var loginBusy = false;

    attachClearHandlers(loginForm);

    loginForm.addEventListener("submit", function (event) {
      event.preventDefault();
      if (loginBusy) return;

      var invalid = [];
      var email = loginEmail.value.trim();
      var password = loginPassword.value;

      clearError(loginEmail);
      clearError(loginPassword);

      if (!email) {
        showError(loginEmail, "Enter your school email address.");
        invalid.push(loginEmail);
      } else if (!EMAIL_RE.test(email)) {
        showError(loginEmail, "That doesn't look like a valid email address.");
        invalid.push(loginEmail);
      }

      if (!password) {
        showError(loginPassword, "Enter your password.");
        invalid.push(loginPassword);
      }

      if (invalid.length) {
        focusFirst(invalid);
        return;
      }

      loginBusy = true;
      setLoading(loginSubmit, true, "Checking your account…");

      window.setTimeout(function () {
        var normalized = email.toLowerCase();
        var stored = api.findUser(normalized);
        var isDemo =
          normalized === DEMO_ACCOUNT.email && password === DEMO_ACCOUNT.password;
        var account = isDemo ? DEMO_ACCOUNT : stored;

        if (account && password === account.password) {
          api.setSession(
            {
              name: account.name,
              email: account.email,
              studentId: account.studentId || "",
              institute: account.institute || "",
              program: account.program || "",
              signedInAt: new Date().toISOString()
            },
            Boolean(loginRemember && loginRemember.checked)
          );

          api.toast(
            "Welcome back, " + String(account.name).trim().split(/\s+/)[0] + "!",
            "Your account is ready. Taking you back to the homepage…",
            "success"
          );

          redirectSoon("../index.html?welcome=1", 1000);
          return;
        }

        loginBusy = false;
        setLoading(loginSubmit, false);

        showError(
          loginPassword,
          "The email and password don't match our records. Please try again."
        );
        loginPassword.focus();
        loginPassword.select();

        api.toast(
          "Couldn't sign you in",
          "Double-check your email and password, or use the demo account shown below the form.",
          "error"
        );
      }, 650);
    });

    var forgotLink = document.getElementById("forgot-link");
    if (forgotLink) {
      forgotLink.addEventListener("click", function (event) {
        event.preventDefault();
        api.toast(
          "Password reset",
          "Resets are handled by the Finance Office. Email finance@tcgc.edu.ph or visit the office with your student ID.",
          "info"
        );
      });
    }

    /* returning from a successful sign-up */
    var params = new URLSearchParams(window.location.search);
    if (params.get("registered") === "1") {
      var emailParam = params.get("email");
      if (emailParam && loginEmail) {
        loginEmail.value = emailParam;
      }

      api.toast(
        "Account created",
        "You can now log in with your school email and new password.",
        "success"
      );

      if (window.history.replaceState) {
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }

  /* =========================================================
     SIGN-UP PAGE
     ========================================================= */
  var signupForm = document.getElementById("signup-form");

  if (signupForm) {
    var nameInput = document.getElementById("signup-name");
    var studentIdInput = document.getElementById("signup-student-id");
    var instituteInput = document.getElementById("signup-institute");
    var programInput = document.getElementById("signup-program");
    var emailInput = document.getElementById("signup-email");
    var passwordInput = document.getElementById("signup-password");
    var confirmInput = document.getElementById("signup-confirm");
    var termsInput = document.getElementById("signup-terms");
    var termsField = document.getElementById("terms-field");
    var termsError = document.getElementById("signup-terms-error");
    var signupSubmit = document.getElementById("signup-submit");
    var strengthBox = document.getElementById("signup-strength");
    var strengthLabel = document.getElementById("signup-strength-label");
    var signupBusy = false;

    attachClearHandlers(signupForm);

    passwordInput.addEventListener("input", function () {
      var score = passwordInput.value ? scorePassword(passwordInput.value) : 0;
      strengthBox.setAttribute("data-level", String(score));
      strengthLabel.textContent = STRENGTH_TEXT[score];

      if (confirmInput.value) {
        clearError(confirmInput);
      }
    });

    function clearTermsError() {
      termsField.classList.remove("has-error");
      termsError.hidden = true;
      termsError.textContent = "";
      termsInput.removeAttribute("aria-invalid");
    }

    termsInput.addEventListener("change", clearTermsError);

    function validateSignup() {
      var invalid = [];

      clearError(nameInput);
      clearError(studentIdInput);
      clearError(instituteInput);
      clearError(programInput);
      clearError(emailInput);
      clearError(passwordInput);
      clearError(confirmInput);
      clearTermsError();

      var name = nameInput.value.trim();
      var studentId = studentIdInput.value.trim();
      var institute = instituteInput.value;
      var program = programInput.value;
      var email = emailInput.value.trim().toLowerCase();
      var password = passwordInput.value;
      var confirm = confirmInput.value;

      if (name.length < 3) {
        showError(nameInput, "Enter your full name as it appears in school records.");
        invalid.push(nameInput);
      } else if (!/^[A-Za-z\u00C0-\u024F.,'\-\s]+$/.test(name)) {
        showError(nameInput, "Use letters, spaces, periods, commas, hyphens, or apostrophes only.");
        invalid.push(nameInput);
      }

      if (!studentId) {
        showError(studentIdInput, "Enter your student ID number.");
        invalid.push(studentIdInput);
      } else if (!/^[A-Za-z0-9][A-Za-z0-9-]{3,14}$/.test(studentId)) {
        showError(studentIdInput, "Use 4–15 letters, numbers, or hyphens (e.g. 2024-00123).");
        invalid.push(studentIdInput);
      }

      if (!institute) {
        showError(instituteInput, "Select the institute you belong to.");
        invalid.push(instituteInput);
      }

      if (!program) {
        showError(programInput, "Select the program you are enrolled in.");
        invalid.push(programInput);
      }

      if (!email) {
        showError(emailInput, "Enter your school email address.");
        invalid.push(emailInput);
      } else if (!EMAIL_RE.test(email)) {
        showError(emailInput, "That doesn't look like a valid email address.");
        invalid.push(emailInput);
      } else if (email === DEMO_ACCOUNT.email || api.findUser(email)) {
        showError(
          emailInput,
          "An account already uses this email. Try logging in instead."
        );
        invalid.push(emailInput);
      }

      if (!password) {
        showError(passwordInput, "Create a password for your account.");
        invalid.push(passwordInput);
      } else if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
        showError(passwordInput, "Use at least 8 characters, including letters and numbers.");
        invalid.push(passwordInput);
      }

      if (!confirm) {
        showError(confirmInput, "Re-enter your password to confirm it.");
        invalid.push(confirmInput);
      } else if (confirm !== password) {
        showError(confirmInput, "Those passwords don't match. Please retype them.");
        invalid.push(confirmInput);
      }

      if (!termsInput.checked) {
        termsField.classList.add("has-error");
        termsError.textContent = "Please accept the Terms of Service and Privacy Policy.";
        termsError.hidden = false;
        termsInput.setAttribute("aria-invalid", "true");
        invalid.push(termsInput);
      }

      if (invalid.length) {
        focusFirst(invalid);
        return false;
      }

      return true;
    }

    signupForm.addEventListener("submit", function (event) {
      event.preventDefault();
      if (signupBusy) return;
      if (!validateSignup()) return;

      signupBusy = true;
      setLoading(signupSubmit, true, "Creating your account…");

      window.setTimeout(function () {
        var users = api.getUsers();
        var email = emailInput.value.trim().toLowerCase();

        users.push({
          name: nameInput.value.trim(),
          studentId: studentIdInput.value.trim(),
          institute: instituteInput.value,
          program: programInput.value,
          email: email,
          password: passwordInput.value,
          createdAt: new Date().toISOString()
        });

        api.saveUsers(users);

        api.toast(
          "Account created",
          "You're all set. Redirecting you to the login page…",
          "success"
        );

        redirectSoon("login.html?registered=1&email=" + encodeURIComponent(email), 1100);
      }, 700);
    });
  }

  /* ---------- legal links (placeholder) ---------- */
  document.querySelectorAll("[data-legal]").forEach(function (link) {
    link.addEventListener("click", function (event) {
      event.preventDefault();
      var kind = link.getAttribute("data-legal");
      api.toast(
        kind === "privacy" ? "Privacy Policy" : "Terms of Service",
        "This demo storefront keeps your details in this browser only. The official policy is available at the Finance Office.",
        "info"
      );
    });
  });
})();
