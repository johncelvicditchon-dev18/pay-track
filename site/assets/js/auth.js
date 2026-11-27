/* =========================================================
   TCGC PayTrack — login & sign-up logic
   Accounts are created in Firebase Authentication and stored
   in the Firestore `users` collection.
   ========================================================= */

(function () {
  "use strict";

  var api = window.TCGC;
  if (!api) return;

  var STUDENT_ID_RE = /^[A-Za-z0-9][A-Za-z0-9-]{3,14}$/;

  /*
   * Firebase is the source of truth. Remove stale browser caches so records or
   * accounts deleted in Firebase don't reappear for a new/existing account.
   */
  function clearLocalData(includeRoster) {
    try {
      if (includeRoster) {
        var keys = [];

        for (var i = 0; i < window.localStorage.length; i += 1) {
          var key = window.localStorage.key(i);
          if (key && key.indexOf("tcgc_paytrack_students") === 0) {
            keys.push(key);
          }
        }

        keys.forEach(function (key) {
          window.localStorage.removeItem(key);
        });
      }

      window.localStorage.removeItem("tcgc_paytrack_users");
      window.localStorage.removeItem("tcgc_paytrack_profiles");
    } catch (error) {
      /* ignore storage failures */
    }
  }

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
    var loginStudentId = document.getElementById("login-student-id");
    var loginPassword = document.getElementById("login-password");
    var loginRemember = document.getElementById("remember-me");
    var loginSubmit = document.getElementById("login-submit");
    var loginBusy = false;

    attachClearHandlers(loginForm);

    loginForm.addEventListener("submit", function (event) {
      event.preventDefault();
      if (loginBusy) return;

      var invalid = [];
      var studentId = loginStudentId.value.trim();
      var password = loginPassword.value;

      clearError(loginStudentId);
      clearError(loginPassword);

      if (!studentId) {
        showError(loginStudentId, "Enter your student ID.");
        invalid.push(loginStudentId);
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
        var normalized = api.normalizeStudentId(studentId);

        function nextTarget() {
          var nextView = "";
          try {
            nextView =
              new URLSearchParams(window.location.search).get("next") || "";
          } catch (err) {
            nextView = "";
          }

          var destinations = {
            accounts: "dashboard.html#accounts",
            students: "dashboard.html#students"
          };
          return destinations[nextView] || "dashboard.html";
        }

        function finish(account, idToken, refreshToken) {
          if (window.TCGCFirebase && window.TCGCFirebase.setAuthToken) {
            window.TCGCFirebase.setAuthToken(idToken || "");
          }

          if (idToken) {
            clearLocalData(false);
          }

          api.setSession(
            {
              name: account.name || "Student",
              studentId: account.studentId || normalized,
              position: account.position || "",
              yearLevel: account.yearLevel || "",
              council: account.council || "",
              idToken: idToken || "",
              refreshToken: refreshToken || "",
              signedInAt: new Date().toISOString()
            },
            Boolean(loginRemember && loginRemember.checked)
          );

          api.toast(
            "Welcome back, " +
              String(account.name || "Student").trim().split(/\s+/)[0] +
              "!",
            "Your account is ready. Taking you to your dashboard…",
            "success"
          );

          redirectSoon(nextTarget(), 1000);
        }

        function fail(message) {
          loginBusy = false;
          setLoading(loginSubmit, false);

          showError(
            loginPassword,
            message ||
              "The student ID and password don't match our records. Please try again."
          );
          loginPassword.focus();
          loginPassword.select();

          api.toast(
            "Couldn't sign you in",
            message ||
              "Double-check your student ID and password, or contact the Finance Office for help.",
            "error"
          );
        }

        var local = api.findUser(normalized);

        function localFallback() {
          if (local && password === local.password) {
            finish(local, "");
            return true;
          }
          return false;
        }

        if (
          window.TCGCFirebase &&
          window.TCGCFirebase.available &&
          window.TCGCFirebase.signInAccount
        ) {
          window.TCGCFirebase.signInAccount(normalized, password)
            .then(function (result) {
              var profile = result.profile || {};

              finish(
                {
                  name: profile.name || (local && local.name) || "Student",
                  studentId: profile.studentId || normalized,
                  position: profile.position || (local && local.position) || "",
                  yearLevel:
                    profile.yearLevel || (local && local.yearLevel) || "",
                  council: profile.council || (local && local.council) || ""
                },
                result.idToken,
                result.refreshToken
              );
            })
            .catch(function (error) {
              if (localFallback()) return;

              var code = error && error.code;
              if (code === "auth-disabled") {
                fail(
                  "Email/password sign-in isn't enabled in Firebase Authentication."
                );
                return;
              }
              if (code === "unauthorized-domain") {
                fail(
                  "This domain isn't authorized in Firebase Authentication. Add it under Authorized domains."
                );
                return;
              }
              if (code === "unavailable") {
                fail(
                  "Can't reach Firebase right now. Check your connection and try again."
                );
                return;
              }
              if (code === "too-many-requests") {
                fail("Too many attempts. Please wait a moment and try again.");
                return;
              }
              fail();
            });
          return;
        }

        if (!localFallback()) fail();
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
      var idParam = params.get("studentId");
      if (idParam && loginStudentId) {
        loginStudentId.value = idParam;
      }

      api.toast(
        "Account created",
        "You can now log in with your student ID and new password.",
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
    var positionInput = document.getElementById("signup-position");
    var yearLevelInput = document.getElementById("signup-year-level");
    var councilInput = document.getElementById("signup-council");
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

    function populatePositions() {
      var positions = api.positionsForCouncil(councilInput.value);
      positionInput.innerHTML = "";

      var placeholder = document.createElement("option");
      placeholder.value = "";
      placeholder.disabled = true;
      placeholder.selected = true;
      placeholder.textContent = positions.length
        ? "Select your position"
        : "Select your council or organization first";
      positionInput.appendChild(placeholder);

      positions.forEach(function (position) {
        var option = document.createElement("option");
        option.value = position;
        option.textContent = position;
        positionInput.appendChild(option);
      });

      positionInput.disabled = !positions.length;
    }

    if (councilInput && positionInput) {
      councilInput.addEventListener("change", function () {
        populatePositions();
        clearError(positionInput);
      });
      populatePositions();
    }

    [nameInput].forEach(function (input) {
      if (!input) return;

      input.addEventListener("input", function () {
        var start = input.selectionStart;
        var end = input.selectionEnd;
        input.value = input.value.toUpperCase();
        if (start !== null) {
          input.setSelectionRange(start, end);
        }
      });
    });

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
      clearError(positionInput);
      clearError(yearLevelInput);
      clearError(councilInput);
      clearError(passwordInput);
      clearError(confirmInput);
      clearTermsError();

      var name = nameInput.value.trim();
      var studentId = studentIdInput.value.trim();
      var position = positionInput.value.trim();
      var yearLevel = yearLevelInput.value;
      var council = councilInput.value;
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
      } else if (!STUDENT_ID_RE.test(studentId)) {
        showError(studentIdInput, "Use 4–15 letters, numbers, or hyphens.");
        invalid.push(studentIdInput);
      } else if (api.findUser(studentId)) {
        showError(
          studentIdInput,
          "An account already uses this student ID. Try logging in instead."
        );
        invalid.push(studentIdInput);
      }

      if (!council) {
        showError(councilInput, "Select your council or organization.");
        invalid.push(councilInput);
      } else if (api.COUNCILS.indexOf(api.normalizeCouncil(council)) === -1) {
        showError(councilInput, "Choose a valid council or organization.");
        invalid.push(councilInput);
      }

      if (!position) {
        showError(positionInput, "Select your position.");
        invalid.push(positionInput);
      } else if (
        api.positionsForCouncil(council).indexOf(position.toUpperCase()) === -1
      ) {
        showError(
          positionInput,
          "Choose a position offered by your council or organization."
        );
        invalid.push(positionInput);
      }

      if (!yearLevel) {
        showError(yearLevelInput, "Select your year level.");
        invalid.push(yearLevelInput);
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
        var studentId = api.normalizeStudentId(studentIdInput.value);
        var account = {
          name: nameInput.value.trim().toUpperCase(),
          studentId: studentId,
          position: positionInput.value.trim().toUpperCase(),
          yearLevel: yearLevelInput.value,
          council: api.normalizeCouncil(councilInput.value),
          createdAt: new Date().toISOString()
        };

        function done(result) {
          if (result && result.profileSaved === false) {
            api.toast(
              "Account created",
              "Your login was created, but your profile couldn't be saved to Firestore. Deploy the Firebase rules and contact the Finance Office if details are missing.",
              "info"
            );
          } else {
            api.toast(
              "Account created",
              "You're all set. Redirecting you to the login page…",
              "success"
            );
          }

          redirectSoon(
            "login.html?registered=1&studentId=" + encodeURIComponent(studentId),
            1100
          );
        }

        function fail(message, field) {
          signupBusy = false;
          setLoading(signupSubmit, false);

          if (field) showError(field, message);

          api.toast("Couldn't create your account", message, "error");
        }

        if (
          window.TCGCFirebase &&
          window.TCGCFirebase.available &&
          window.TCGCFirebase.createAccount
        ) {
          window.TCGCFirebase.createAccount({
            name: account.name,
            studentId: account.studentId,
            position: account.position,
            yearLevel: account.yearLevel,
            council: account.council,
            password: passwordInput.value
          })
            .then(function (result) {
              clearLocalData(true);
              api.clearSession();
              done(result);
            })
            .catch(function (error) {
              var code = error && error.code;

              if (code === "email-in-use") {
                fail(
                  "That Student ID already has a login. Try logging in instead.",
                  studentIdInput
                );
                return;
              }

              if (code === "weak-password") {
                fail(
                  "Use at least 8 characters, including letters and numbers.",
                  passwordInput
                );
                return;
              }

              if (code === "auth-disabled") {
                fail(
                  "Email/password sign-in isn't enabled in Firebase Authentication."
                );
                return;
              }

              if (code === "unauthorized-domain") {
                fail(
                  "This domain isn't authorized in Firebase Authentication. Add it under Authorized domains."
                );
                return;
              }

              fail(
                error && error.message
                  ? "Firebase rejected the sign-up: " + error.message
                  : "We couldn't save your account. Please try again."
              );
            });
          return;
        }

        // Offline fallback: keep the account in this browser only.
        var users = api.getUsers();
        users.push({
          name: account.name,
          studentId: account.studentId,
          position: account.position,
          yearLevel: account.yearLevel,
          council: account.council,
          password: passwordInput.value,
          createdAt: account.createdAt
        });

        api.saveUsers(users);
        done();
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
        "Your account details are stored in Firebase. The official policy is available at the Finance Office.",
        "info"
      );
    });
  });
})();
