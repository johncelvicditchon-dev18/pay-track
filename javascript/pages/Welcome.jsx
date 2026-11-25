import { useEffect, useRef } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import SiteFooter from "../components/SiteFooter";
import SiteHeader from "../components/SiteHeader";
import PaymentTracker from "../components/PaymentTracker";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

export default function Welcome() {
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const welcomed = useRef(false);

  useEffect(() => {
    if (searchParams.get("welcome") !== "1") return;
    if (welcomed.current) return;

    welcomed.current = true;
    if (user) {
      const firstName = String(user.name || "student").trim().split(/\s+/)[0];
      toast(
        `Welcome back, ${firstName}!`,
        "You are signed in. Your account is ready for this semester.",
        "success"
      );
    }
    navigate("/", { replace: true });
  }, [searchParams, user, toast, navigate]);

  return (
    <>
      <SiteHeader />

      <main id="main">
        {/* ================= HERO ================= */}
        <section className="hero" id="top">
          <div className="container">
            <div className="hero-grid">
              <div className="hero-copy">
                <span className="hero-pill">
                  <b>Official</b>
                  Tangub City Global College
                </span>

                <h1>
                  Every payment,
                  <br />
                  <span className="accent">perfectly tracked.</span>
                </h1>

                <p className="hero-lead">
                  Track institute and organization fees — activity, membership,
                  t-shirt, and miscellaneous charges — with every balance and
                  receipt in plain sight.
                </p>

                {user ? (
                  <div className="hero-signed-in">
                    <span className="hero-signed-in__check" aria-hidden="true">
                      <CheckIcon />
                    </span>
                    <div>
                      <strong>Signed in as {user.name}</strong>
                      <small>
                        Your balance, due dates, and receipts stay in one place.
                      </small>
                    </div>
                  </div>
                ) : (
                  <div className="hero-actions">
                    <Link className="btn btn--light" to="/signup">
                      Create your account
                      <ArrowIcon />
                    </Link>
                    <Link className="btn btn--outline-light" to="/login">
                      Log in to your portal
                    </Link>
                  </div>
                )}

                <PaymentTracker />

                <ul className="hero-points">
                  <li>
                    <span className="check-dot" aria-hidden="true">
                      <CheckIcon />
                    </span>
                    Institute &amp; organization
                  </li>
                  <li>
                    <span className="check-dot" aria-hidden="true">
                      <CheckIcon />
                    </span>
                    Every charge &amp; balance
                  </li>
                  <li>
                    <span className="check-dot" aria-hidden="true">
                      <CheckIcon />
                    </span>
                    Every receipt in view
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* ================= ABOUT ================= */}
        <section className="section section--tint" id="about">
          <div className="container">
            <div className="about-card">
              <img
                className="about-watermark"
                src="/logo/logo-toggle.png"
                alt=""
                aria-hidden="true"
              />
              <div className="about-copy">
                <span className="eyebrow">About PayTrack</span>
                <p className="about-statement">
                  A <em>student-first</em> payment portal for{" "}
                  <strong>Tangub City Global College</strong>.
                </p>
                <p className="about-description">
                  Track institute and organization payments and contributions —
                  activity fees, membership fees, t-shirt payments, and other
                  miscellaneous charges — with every balance and payment in plain
                  sight.
                </p>
                <div className="about-actions">
                  <Link className="btn btn--primary" to={user ? "/#top" : "/signup"}>
                    {user ? "Track another payment" : "Create your account"}
                    <ArrowIcon />
                  </Link>
                  <Link className="btn btn--outline" to={user ? "/#contact" : "/login"}>
                    {user ? "Contact finance" : "Log in"}
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
