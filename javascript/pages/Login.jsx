import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import AuthLayout from "../components/AuthLayout";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { EMAIL_RE } from "../lib/auth";

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

export default function Login() {
  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const registeredHandled = useRef(false);

  const [form, setForm] = useState({ email: "", password: "", remember: false });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (searchParams.get("registered") !== "1" || registeredHandled.current) return;

    registeredHandled.current = true;
    const email = searchParams.get("email") || "";
    if (email) {
      setForm((current) => ({ ...current, email }));
    }

    toast(
      "Account created",
      "You can now log in with your school email and new password.",
      "success"
    );
    navigate("/login", { replace: true });
  }, [searchParams, toast, navigate]);

  const updateField = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
    if (errors[key]) {
      setErrors((current) => ({ ...current, [key]: "" }));
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (busy) return;

    const nextErrors = {};
    const email = form.email.trim();

    if (!email) {
      nextErrors.email = "Enter your school email address.";
    } else if (!EMAIL_RE.test(email)) {
      nextErrors.email = "That doesn't look like a valid email address.";
    }

    if (!form.password) {
      nextErrors.password = "Enter your password.";
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      const target = nextErrors.email ? "login-email" : "login-password";
      window.requestAnimationFrame(() => document.getElementById(target)?.focus());
      return;
    }

    setBusy(true);

    window.setTimeout(() => {
      const session = login(email, form.password, form.remember);

      if (session) {
        navigate("/?welcome=1");
        return;
      }

      setBusy(false);
      setErrors({
        password: "The email and password don't match our records. Please try again.",
      });
      toast(
        "Couldn't sign you in",
        "Double-check your email and password, or use the demo account shown below the form.",
        "error"
      );
      window.requestAnimationFrame(() => {
        const input = document.getElementById("login-password");
        input?.focus();
        input?.select();
      });
    }, 650);
  };

  const forgotPassword = () => {
    toast(
      "Password reset",
      "Resets are handled by the Finance Office. Email finance@tcgc.edu.ph or visit the office with your student ID.",
      "info"
    );
  };

  return (
    <AuthLayout
      variant="login"
      title="Welcome back"
      subtitle="Log in with the school email you registered with."
      footer={
        <p className="auth-switch">
          New to PayTrack? <Link to="/signup">Create an account</Link>
        </p>
      }
    >
      <form className="auth-form" id="login-form" onSubmit={handleSubmit} noValidate>
        <div className={`field${errors.email ? " has-error" : ""}`}>
          <label htmlFor="login-email">School email</label>
          <div className="input-wrap">
            <input
              type="email"
              id="login-email"
              name="email"
              value={form.email}
              onChange={(event) => updateField("email", event.target.value)}
              placeholder="you@tcgc.edu.ph"
              autoComplete="email"
              inputMode="email"
              spellCheck="false"
              aria-describedby="login-email-error"
              aria-invalid={Boolean(errors.email)}
              required
            />
          </div>
          <p className="field-error" id="login-email-error" role="alert" hidden={!errors.email}>
            {errors.email}
          </p>
        </div>

        <div className={`field${errors.password ? " has-error" : ""}`}>
          <div className="label-row">
            <label htmlFor="login-password">Password</label>
            <button className="link-quiet" type="button" onClick={forgotPassword}>
              Forgot password?
            </button>
          </div>
          <div className="input-wrap">
            <input
              type={showPassword ? "text" : "password"}
              id="login-password"
              name="password"
              value={form.password}
              onChange={(event) => updateField("password", event.target.value)}
              placeholder="Enter your password"
              autoComplete="current-password"
              aria-describedby="login-password-error"
              aria-invalid={Boolean(errors.password)}
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
          <p className="field-error" id="login-password-error" role="alert" hidden={!errors.password}>
            {errors.password}
          </p>
        </div>

        <label className="check">
          <input
            type="checkbox"
            id="remember-me"
            name="remember"
            checked={form.remember}
            onChange={(event) => updateField("remember", event.target.checked)}
          />
          Keep me signed in on this device
        </label>

        <button className="btn btn--primary btn--block" type="submit" disabled={busy}>
          {busy ? (
            <>
              <span className="spinner" />
              Checking your account…
            </>
          ) : (
            "Log in"
          )}
        </button>

        <p className="demo-note">
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            style={{ flex: "none", marginTop: 1 }}
          >
            <circle cx="12" cy="12" r="9" />
            <path d="M12 8h.01M11 12h1v4h1" />
          </svg>
          <span>
            Demo account: <code>student@tcgc.edu</code> / <code>tcgc1234</code>
          </span>
        </p>
      </form>
    </AuthLayout>
  );
}
