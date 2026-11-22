import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthLayout from "../components/AuthLayout";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import {
  DEMO_ACCOUNT,
  EMAIL_RE,
  findUser,
} from "../lib/auth";
import {
  INSTITUTES,
  INSTITUTE_PROGRAMS,
  YEAR_LEVELS,
} from "../data/academic";

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
  institute: "signup-institute",
  program: "signup-program",
  yearLevel: "signup-year-level",
  email: "signup-email",
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
    institute: "",
    program: "",
    yearLevel: "",
    email: "",
    password: "",
    confirm: "",
    terms: false,
  });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [busy, setBusy] = useState(false);

  const programOptions = form.institute
    ? INSTITUTE_PROGRAMS[form.institute] || []
    : [];
  const strength = form.password ? scorePassword(form.password) : 0;

  const strengthLabel = useMemo(
    () => (form.password ? STRENGTH_TEXT[strength] : STRENGTH_TEXT[0]),
    [form.password, strength]
  );

  const updateField = (key, value) => {
    setForm((current) => {
      const next = { ...current, [key]: value };
      if (key === "institute") next.program = "";
      return next;
    });

    setErrors((current) => {
      const next = { ...current, [key]: "" };
      if (key === "institute") next.program = "";
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
    const email = form.email.trim().toLowerCase();

    if (name.length < 3) {
      next.name = "Enter your full name as it appears in school records.";
    } else if (!/^[A-Za-z\u00C0-\u024F.,'\-\s]+$/.test(name)) {
      next.name = "Use letters, spaces, periods, commas, hyphens, or apostrophes only.";
    }

    if (!studentId) {
      next.studentId = "Enter your student ID number.";
    } else if (!/^[A-Za-z0-9][A-Za-z0-9-]{3,14}$/.test(studentId)) {
      next.studentId = "Use 4–15 letters, numbers, or hyphens (e.g. 2024-00123).";
    }

    if (!form.institute) {
      next.institute = "Select the institute you belong to.";
    }

    if (!form.program) {
      next.program = "Select the program you are enrolled in.";
    } else if (!INSTITUTE_PROGRAMS[form.institute]?.includes(form.program)) {
      next.program = "Select a program offered by your institute.";
    }

    if (!form.yearLevel) {
      next.yearLevel = "Select your year level.";
    } else if (!YEAR_LEVELS.includes(form.yearLevel)) {
      next.yearLevel = "Choose a valid year level.";
    }

    if (!email) {
      next.email = "Enter your school email address.";
    } else if (!EMAIL_RE.test(email)) {
      next.email = "That doesn't look like a valid email address.";
    } else if (email === DEMO_ACCOUNT.email || findUser(email)) {
      next.email = "An account already uses this email. Try logging in instead.";
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

  const handleSubmit = (event) => {
    event.preventDefault();
    if (busy) return;
    if (!validate()) return;

    setBusy(true);

    window.setTimeout(() => {
      const result = signup(form);

      if (!result.ok) {
        setBusy(false);
        setErrors({ email: "An account already uses this email. Try logging in instead." });
        toast(
          "Couldn't create your account",
          "That email is already registered. Try logging in instead.",
          "error"
        );
        document.getElementById("signup-email")?.focus();
        return;
      }

      navigate(
        `/login?registered=1&email=${encodeURIComponent(form.email.trim().toLowerCase())}`
      );
    }, 700);
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
            value={form.name}
            onChange={(event) => updateField("name", event.target.value)}
            placeholder="Juan Dela Cruz"
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
            placeholder="e.g. 2024-00123"
            autoComplete="off"
            spellCheck="false"
            aria-invalid={Boolean(errors.studentId)}
            aria-describedby="signup-student-id-error"
            required
          />
          <p className="field-error" id="signup-student-id-error" role="alert" hidden={!errors.studentId}>
            {errors.studentId}
          </p>
        </div>

        <div className="field-row">
          <div className={`field${errors.institute ? " has-error" : ""}`}>
            <label htmlFor="signup-institute">Institute</label>
            <select
              id="signup-institute"
              name="institute"
              value={form.institute}
              onChange={(event) => updateField("institute", event.target.value)}
              aria-invalid={Boolean(errors.institute)}
              aria-describedby="signup-institute-error"
              required
            >
              <option value="" disabled>
                Select your institute
              </option>
              {INSTITUTES.map((institute) => (
                <option key={institute} value={institute}>
                  {institute}
                </option>
              ))}
            </select>
            <p className="field-error" id="signup-institute-error" role="alert" hidden={!errors.institute}>
              {errors.institute}
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
        </div>

        <div className={`field${errors.program ? " has-error" : ""}`}>
          <label htmlFor="signup-program">Program</label>
          <select
            id="signup-program"
            name="program"
            value={form.program}
            onChange={(event) => updateField("program", event.target.value)}
            disabled={!form.institute}
            aria-invalid={Boolean(errors.program)}
            aria-describedby="signup-program-error"
            required
          >
            <option value="" disabled>
              {form.institute ? "Select your program" : "Select an institute first"}
            </option>
            {programOptions.map((program) => (
              <option key={program} value={program}>
                {program}
              </option>
            ))}
          </select>
          <p className="field-error" id="signup-program-error" role="alert" hidden={!errors.program}>
            {errors.program}
          </p>
        </div>

        <div className={`field${errors.email ? " has-error" : ""}`}>
          <label htmlFor="signup-email">School email</label>
          <input
            type="email"
            id="signup-email"
            name="email"
            value={form.email}
            onChange={(event) => updateField("email", event.target.value)}
            placeholder="you@tcgc.edu.ph"
            autoComplete="email"
            inputMode="email"
            spellCheck="false"
            aria-invalid={Boolean(errors.email)}
            aria-describedby="signup-email-error"
            required
          />
          <p className="field-error" id="signup-email-error" role="alert" hidden={!errors.email}>
            {errors.email}
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
