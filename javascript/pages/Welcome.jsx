import { useEffect, useRef } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import SiteFooter from "../components/SiteFooter";
import SiteHeader from "../components/SiteHeader";
import PaymentTracker from "../components/PaymentTracker";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

const dashboardRows = [
  {
    label: "Tuition — Prelim",
    date: "Paid Aug 15, 2026",
    status: "Paid",
    paid: true,
  },
  {
    label: "Laboratory fees",
    date: "Paid Sep 02, 2026",
    status: "Paid",
    paid: true,
  },
  {
    label: "Tuition — Midterm",
    date: "Due Oct 15, 2026",
    status: "Due soon",
    paid: false,
  },
];

const stats = [
  { value: "12,400+", label: "Students served" },
  { value: "₱8.6M+", label: "Payments recorded" },
  { value: "98.2%", label: "On-time payments" },
  { value: "24/7", label: "Balance visibility" },
];

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
                  One calm, secure place to see your tuition balance, upcoming due
                  dates, and verified receipts — no more lining up at the finance
                  office just to ask, “How much do I still owe?”
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
                    Real-time balances
                  </li>
                  <li>
                    <span className="check-dot" aria-hidden="true">
                      <CheckIcon />
                    </span>
                    Deadline reminders
                  </li>
                  <li>
                    <span className="check-dot" aria-hidden="true">
                      <CheckIcon />
                    </span>
                    Verified receipts
                  </li>
                </ul>
              </div>

              <div className="hero-visual">
                <div className="dash" aria-hidden="true">
                  <div className="dash-top">
                    <div>
                      <p className="dash-eyebrow">Student portal</p>
                      <h2>My payments</h2>
                    </div>
                    <span className="dash-chip">A.Y. 2026–2027</span>
                  </div>

                  <div className="dash-balance">
                    <div className="dash-balance-row">
                      <span>Outstanding balance</span>
                      <span className="dash-percent">62% paid</span>
                    </div>
                    <p className="dash-amount">
                      ₱12,450<span>.00</span>
                    </p>
                    <div className="dash-bar">
                      <span style={{ "--w": "62%" }} />
                    </div>
                    <div className="dash-balance-foot">
                      <span>Paid ₱20,300.00</span>
                      <span>Total ₱32,750.00</span>
                    </div>
                  </div>

                  <ul className="dash-list">
                    {dashboardRows.map((row) => (
                      <li key={row.label}>
                        <span className="dash-icon">
                          {row.paid ? (
                            <svg
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M20 6 9 17l-5-5" />
                            </svg>
                          ) : (
                            <svg
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <circle cx="12" cy="12" r="9" />
                              <path d="M12 7v5l3 2" />
                            </svg>
                          )}
                        </span>
                        <div>
                          <strong>{row.label}</strong>
                          <small>{row.date}</small>
                        </div>
                        <span
                          className={`status ${
                            row.paid ? "status--paid" : "status--due"
                          }`}
                        >
                          {row.status}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="float-card float-card--receipt" aria-hidden="true">
                  <span className="float-icon">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M6 2h12v20l-3-2-3 2-3-2-3 2V2Z" />
                      <path d="M9 7h6M9 11h6" />
                    </svg>
                  </span>
                  <div>
                    <strong>Receipt verified</strong>
                    <small>₱3,500.00 · Ref #A-10428</small>
                  </div>
                </div>

                <div className="float-card float-card--reminder" aria-hidden="true">
                  <span className="float-icon float-icon--accent">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
                      <path d="M10.3 21a2 2 0 0 0 3.4 0" />
                    </svg>
                  </span>
                  <div>
                    <strong>Next due in 6 days</strong>
                    <small>Tuition — Midterm</small>
                  </div>
                </div>
              </div>
            </div>

            <div className="hero-stats" aria-label="System highlights">
              {stats.map((stat) => (
                <div key={stat.label}>
                  <strong>{stat.value}</strong>
                  <span>{stat.label}</span>
                </div>
              ))}
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
                  <strong>Tangub City Global College</strong>, keeping every
                  balance, deadline, and receipt in plain sight.
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
