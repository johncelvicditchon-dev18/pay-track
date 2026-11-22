import { Link } from "react-router-dom";
import Brand from "./Brand";

const ASIDE_COPY = {
  login: {
    tag: "Student portal",
    title: (
      <>
        Know exactly where your <em>payments stand.</em>
      </>
    ),
    description:
      "Your balance, deadlines, and receipts — always current, always in one place. Sign in to pick up right where you left off.",
    items: [
      {
        title: "Balances updated in real time",
        detail: "No waiting for a cashier printout",
      },
      {
        title: "Every receipt, kept safe",
        detail: "Download proof of payment anytime",
      },
      {
        title: "Reminders before deadlines",
        detail: "So no late fees sneak up on you",
      },
    ],
  },
  signup: {
    tag: "Get started",
    title: (
      <>
        Your semester, <em>financially in order.</em>
      </>
    ),
    description:
      "Create a free account and get a single, trustworthy record of every payment you make at Tangub City Global College.",
    items: [
      {
        title: "One account, all your records",
        detail: "From first prelim to final balance",
      },
      {
        title: "No more queueing for balances",
        detail: "Check anytime, even during enrollment",
      },
      {
        title: "Receipts ready for download",
        detail: "Share verified proof in a few clicks",
      },
    ],
  },
};

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

export default function AuthLayout({ variant, title, subtitle, children, footer }) {
  const copy = ASIDE_COPY[variant];

  return (
    <div className="auth-page">
      <aside className="auth-aside" aria-hidden="true">
        <Brand />

        <div className="auth-aside-content">
          <span className="auth-aside-tag">{copy.tag}</span>
          <h2>{copy.title}</h2>
          <p>{copy.description}</p>

          <ul className="auth-list">
            {copy.items.map((item) => (
              <li key={item.title}>
                <span className="check-dot">
                  <CheckIcon />
                </span>
                <div>
                  {item.title}
                  <small>{item.detail}</small>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="auth-aside-foot">
          <span />
          Tangub City Global College · Finance Office
        </p>
      </aside>

      <main className="auth-main">
        <Link className="auth-back" to="/">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M19 12H5M11 18l-6-6 6-6" />
          </svg>
          Back to home
        </Link>

        <div className="auth-card">
          <div className="auth-card-head">
            <Brand to="/" className="mobile-brand" />
            <h1>{title}</h1>
            <p>{subtitle}</p>
          </div>

          {children}
          {footer}
        </div>
      </main>
    </div>
  );
}
