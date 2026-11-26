import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthLayout from "../components/AuthLayout";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { STUDENT_ID_RE, authErrorMessage } from "../lib/auth";
import { COUNCILS, positionsForCouncil } from "../data/councils";

const YEAR_LEVELS = ["1ST YEAR", "2ND YEAR", "3RD YEAR", "4TH YEAR"];

const STRENGTH_TEXT = [
  "Use 8+ characters with letters and numbers.",
  "Weak — make it longer and less predictable.",
  "Fair — mix letters, numbers, and capitals.",
  "Good — add a symbol for extra strength.",
  "Strong password. Nicely done.",
];

const FIELD_IDS = {
  name: "signup-name",
  studentId: "signup-student-id",
  council: "signup-council",
  position: "signup-position",
  yearLevel: "signup-year-level",
  password: "signup-password",
  confirm: "signup-confirm",
  terms: "signup-terms",
};

function scorePassword(value) {
  let score = 0;
  if (value.length >= 8) score += 1;
  if (value.length >= 12) score += 1;
  if (/[a-z]/.test(value) && /[A-Z]/.test(value)) score += 1;
  if (/[^A-Za-z0-9]/.test(value) || (/\d/.test(value) && value.length >= 10)) score += 1;
  return Math.min(score, 4);
}

function EyeIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m3 3 18 18" />
      <path d="M10.6 10.7a3 3 0 0 0 4.2 4.2" />
      <path d="M9.4 5.2A10.9 10.9 0 0 1 12 5c6.4 0 10 7 10 7a17.6 17.6 0 0 1-3 3.9" />
      <path d="M6.4 6.5A17.3 17.3 0 0 0 2 12s3.6 7 10 7a10.8 10.8 0 0 0 4.2-.8" />
    </svg>
  );
}

export default function Signup() {
  const { signup } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    studentId: "",
    position: "",
    yearLevel: "",
    council: "",
    password: "",
    confirm: "",
    terms: false,
  });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [busy, setBusy] = useState(false);

  const strength = form.password ? scorePassword(form.password) : 0;

  const strengthLabel = useMemo(
    () => (form.password ? STRENGTH_TEXT[strength] : STRENGTH_TEXT[0]),
    [form.password, strength]
  );

  const updateField = (key, value) => {
    setForm((current) => {
      const next = { ...current, [key]: value };
      if (key === "council") next.position = "";
      return next;
    });

    setErrors((current) => {
      const next = { ...current, [key]: "" };
      if (key === "council") next.position = "";
      if (key === "password") next.confirm = "";
      return next;
    });
  };

  const legalToast = (kind) => {
    toast(
      kind === "privacy" ? "Privacy Policy" : "Terms of Service",
      "This demo stores your details in this browser only. The official policy is available at the Finance Office.",
      "info"
    );
  };

  const validate = () => {
    const next = {};
    const name = form.name.trim();
    const studentId = form.studentId.trim();

    if (name.length < 3) {
      next.name = "Enter your full name as it appears in school records.";
    } else if (!/^[A-Za-z\u00C0-\u024F.,'\-\s]+$/.test(name)) {
      next.name = "Use letters, spaces, periods, commas, hyphens, or apostrophes only.";
    }

    if (!studentId) {
      next.studentId = "Enter your student ID number.";
    } else if (!STUDENT_ID_RE.test(studentId)) {
      next.studentId = "Use 4–15 letters, numbers, or hyphens.";
    }

    const position = form.position.trim();
    if (!form.council) {
      next.council = "Select your council or organization.";
    } else if (!COUNCILS.includes(form.council)) {
      next.council = "Choose a valid council or organization.";
    }

    if (!position) {
      next.position = "Select your position.";
    } else if (!positionsForCouncil(form.council).includes(position)) {
      next.position = "Choose a position offered by your council or organization.";
    }

    if (!form.yearLevel) {
      next.yearLevel = "Select your year level.";
    } else if (!YEAR_LEVELS.includes(form.yearLevel)) {
      next.yearLevel = "Choose a valid year level.";
    }

    if (!form.password) {
      next.password = "Create a password for your account.";
    } else if (
      form.password.length < 8 ||
      !/[A-Za-z]/.test(form.password) ||
      !/\d/.test(form.password)
    ) {
      next.password = "Use at least 8 characters, including letters and numbers.";
    }

    if (!form.confirm) {
      next.confirm = "Re-enter your password to confirm it.";
    } else if (form.confirm !== form.password) {
      next.confirm = "Those passwords don't match. Please retype them.";
    }

    if (!form.terms) {
      next.terms = "Please accept the Terms of Service and Privacy Policy.";
    }

    setErrors(next);

    const firstError = Object.keys(FIELD_IDS).find((key) => next[key]);
    if (firstError) {
      window.requestAnimationFrame(() =>
        document.getElementById(FIELD_IDS[firstError])?.focus()
      );
      return false;
    }

    return true;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (busy) return;
    if (!validate()) return;

    setBusy(true);

    try {
      const result = await signup(form);
      setBusy(false);

      if (!result.ok) {
        const code = String(result.code || result.error?.code || "");
        const message = authErrorMessage(
          result.error,
          "We couldn't create your account. Please try again."
        );

        if (code === "auth/email-already-in-use") {
          setErrors({
            studentId:
              "This Student ID already has a login. Sign in instead, or ask the Finance Office to remove the old login.",
          });
          toast(
            "Couldn't create your account",
            "This Student ID already has a login. Sign in with it, or ask the Finance Office for help.",
            "error"
          );
          document.getElementById("signup-student-id")?.focus();
          return;
        }

        if (code === "auth/invalid-email" || code === "auth/missing-email") {
          setErrors({ studentId: message });
          document.getElementById("signup-student-id")?.focus();
          return;
        }

        if (code === "auth/weak-password") {
          setErrors({ password: message });
          document.getElementById("signup-password")?.focus();
          return;
        }

        toast("Couldn't create your account", message, "error");
        return;
      }

      if (result.profileSaved === false) {
        toast(
          "Account created",
          "Your login works, but your profile details couldn't be saved to the database. Contact the Finance Office if your record looks incomplete.",
          "info"
        );
      }

      navigate(
        `/login?registered=1&studentId=${encodeURIComponent(
          form.studentId.trim().toUpperCase()
        )}`
      );
    } catch (error) {
      console.error("[signup] Firebase error:", error);
      setBusy(false);
      toast(
        "Couldn't create your account",
        authErrorMessage(error),
        "error"
      );
    }
  };

  return (
    <AuthLayout
      variant="signup"
      title="Create your account"
      subtitle="Use your details exactly as they appear in the registrar's record."
      footer={
        <>
          <p className="auth-switch">
            Already registered? <Link to="/login">Log in instead</Link>
          </p>
          <p className="form-footnote">
            Your details are used only to match you with your official finance
            record. You can request corrections from the Finance Office.
          </p>
        </>
      }
    >
      <form className="auth-form" id="signup-form" onSubmit={handleSubmit} noValidate>
        <div className={`field${errors.name ? " has-error" : ""}`}>
          <label htmlFor="signup-name">Full name</label>
          <input
            type="text"
            id="signup-name"
            name="name"
            className="is-uppercase"
            value={form.name}
            onChange={(event) => updateField("name", event.target.value)}
            placeholder="JUAN DELA CRUZ"
            autoComplete="name"
            aria-invalid={Boolean(errors.name)}
            aria-describedby="signup-name-error"
            required
          />
          <p className="field-error" id="signup-name-error" role="alert" hidden={!errors.name}>
            {errors.name}
          </p>
        </div>

        <div className={`field${errors.studentId ? " has-error" : ""}`}>
          <label htmlFor="signup-student-id">Student ID</label>
          <input
            type="text"
            id="signup-student-id"
            name="studentId"
            value={form.studentId}
            onChange={(event) => updateField("studentId", event.target.value)}
            placeholder="XXXXXXX"
            autoComplete="username"
            spellCheck="false"
            aria-invalid={Boolean(errors.studentId)}
            aria-describedby="signup-student-id-error"
            required
          />
          <p className="field-error" id="signup-student-id-error" role="alert" hidden={!errors.studentId}>
            {errors.studentId}
          </p>
        </div>

        <div className={`field${errors.council ? " has-error" : ""}`}>
          <label htmlFor="signup-council">Council / Organization</label>
          <select
            id="signup-council"
            name="council"
            value={form.council}
            onChange={(event) => updateField("council", event.target.value)}
            aria-invalid={Boolean(errors.council)}
            aria-describedby="signup-council-error"
            required
          >
            <option value="" disabled>
              Select your council or organization
            </option>
            {COUNCILS.map((council) => (
              <option key={council} value={council}>
                {council}
              </option>
            ))}
          </select>
          <p className="field-error" id="signup-council-error" role="alert" hidden={!errors.council}>
            {errors.council}
          </p>
        </div>

        <div className={`field${errors.position ? " has-error" : ""}`}>
          <label htmlFor="signup-position">Position</label>
          <select
            id="signup-position"
            name="position"
            value={form.position}
            onChange={(event) => updateField("position", event.target.value)}
            disabled={!form.council}
            aria-invalid={Boolean(errors.position)}
            aria-describedby="signup-position-error"
            required
          >
            <option value="" disabled>
              {form.council
                ? "Select your position"
                : "Select your council or organization first"}
            </option>
            {positionsForCouncil(form.council).map((position) => (
              <option key={position} value={position}>
                {position}
              </option>
            ))}
          </select>
          <p className="field-error" id="signup-position-error" role="alert" hidden={!errors.position}>
            {errors.position}
          </p>
        </div>

        <div className={`field${errors.yearLevel ? " has-error" : ""}`}>
          <label htmlFor="signup-year-level">Year level</label>
          <select
            id="signup-year-level"
            name="yearLevel"
            value={form.yearLevel}
            onChange={(event) => updateField("yearLevel", event.target.value)}
            aria-invalid={Boolean(errors.yearLevel)}
            aria-describedby="signup-year-level-error"
            required
          >
            <option value="" disabled>
              Select year level
            </option>
            {YEAR_LEVELS.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
          <p className="field-error" id="signup-year-level-error" role="alert" hidden={!errors.yearLevel}>
            {errors.yearLevel}
          </p>
        </div>

        <div className={`field${errors.password ? " has-error" : ""}`}>
          <label htmlFor="signup-password">Password</label>
          <div className="input-wrap">
            <input
              type={showPassword ? "text" : "password"}
              id="signup-password"
              name="password"
              value={form.password}
              onChange={(event) => updateField("password", event.target.value)}
              placeholder="At least 8 characters"
              autoComplete="new-password"
              aria-invalid={Boolean(errors.password)}
              aria-describedby="signup-password-error signup-strength-label"
              required
            />
            <button
              className="pw-toggle"
              type="button"
              onClick={() => setShowPassword((visible) => !visible)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
            >
              {showPassword ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          </div>

          <div className="strength" data-level={strength}>
            <div className="strength-bars" aria-hidden="true">
              <span />
              <span />
              <span />
              <span />
            </div>
            <span className="strength-label" id="signup-strength-label" aria-live="polite">
              {strengthLabel}
            </span>
          </div>

          <p className="field-error" id="signup-password-error" role="alert" hidden={!errors.password}>
            {errors.password}
          </p>
        </div>

        <div className={`field${errors.confirm ? " has-error" : ""}`}>
          <label htmlFor="signup-confirm">Confirm password</label>
          <div className="input-wrap">
            <input
              type={showConfirm ? "text" : "password"}
              id="signup-confirm"
              name="confirmPassword"
              value={form.confirm}
              onChange={(event) => updateField("confirm", event.target.value)}
              placeholder="Re-enter your password"
              autoComplete="new-password"
              aria-invalid={Boolean(errors.confirm)}
              aria-describedby="signup-confirm-error"
              required
            />
            <button
              className="pw-toggle"
              type="button"
              onClick={() => setShowConfirm((visible) => !visible)}
              aria-label={showConfirm ? "Hide password" : "Show password"}
              aria-pressed={showConfirm}
            >
              {showConfirm ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          </div>
          <p className="field-error" id="signup-confirm-error" role="alert" hidden={!errors.confirm}>
            {errors.confirm}
          </p>
        </div>

        <label className={`check${errors.terms ? " has-error" : ""}`}>
          <input
            type="checkbox"
            id="signup-terms"
            name="terms"
            checked={form.terms}
            onChange={(event) => updateField("terms", event.target.checked)}
            aria-invalid={Boolean(errors.terms)}
            aria-describedby="signup-terms-error"
          />
          <span>
            I agree to the{" "}
            <a
              href="#"
              onClick={(event) => {
                event.preventDefault();
                legalToast("terms");
              }}
            >
              Terms of Service
            </a>{" "}
            and{" "}
            <a
              href="#"
              onClick={(event) => {
                event.preventDefault();
                legalToast("privacy");
              }}
            >
              Privacy Policy
            </a>
            .
          </span>
        </label>
        <p className="field-error field-error--check" id="signup-terms-error" role="alert" hidden={!errors.terms}>
          {errors.terms}
        </p>

        <button className="btn btn--primary btn--block" type="submit" disabled={busy}>
          {busy ? (
            <>
              <span className="spinner" />
              Creating your account…
            </>
          ) : (
            "Create account"
          )}
        </button>
      </form>
    </AuthLayout>
  );
}
