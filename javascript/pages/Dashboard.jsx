import { useCallback, useEffect, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import Brand from "../components/Brand";
import StudentsPanel from "../components/StudentsPanel";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { INSTITUTE_ORGANIZATIONS } from "../data/academic";
import { authErrorMessage, initials, listAccounts } from "../lib/auth";
import "../../design/dashboard.css";

const NAV_KEY = "tcgc_paytrack_nav";
const VIEW_TITLES = { students: "Students", accounts: "Accounts" };

function readHashView() {
  const hash = String(window.location.hash || "").replace(/^#/, "");
  return VIEW_TITLES[hash] ? hash : "students";
}

function display(value) {
  const text = String(value == null ? "" : value).trim();
  return text || "—";
}

function NavIcon({ name }) {
  const paths = {
    accounts: (
      <>
        <circle cx="9" cy="8" r="3.2" />
        <path d="M3.5 19a5.5 5.5 0 0 1 11 0" />
        <path d="M16 5.2a3 3 0 0 1 0 5.6M17.5 13.4a5 5 0 0 1 3 4.6" />
      </>
    ),
    students: (
      <>
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <path d="M3 9h18M9 9v11" />
      </>
    ),
  };

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}

export default function Dashboard() {
  const { user, authReady, logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [view, setView] = useState(readHashView);
  const [navClosed, setNavClosed] = useState(() => {
    try {
      return window.localStorage.getItem(NAV_KEY) === "closed";
    } catch {
      return false;
    }
  });
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(
    () => window.matchMedia("(max-width: 920px)").matches
  );
  const [accounts, setAccounts] = useState([]);
  const [accountsStatus, setAccountsStatus] = useState("idle");
  const [accountsError, setAccountsError] = useState("");
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 920px)");
    const onChange = (event) => {
      setIsMobile(event.matches);
      setMobileNavOpen(false);
    };
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    const onHashChange = () => {
      setView(readHashView());
      setMobileNavOpen(false);
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === "Escape") setMobileNavOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    document.body.classList.toggle("nav-open-lock", mobileNavOpen);
    return () => document.body.classList.remove("nav-open-lock");
  }, [mobileNavOpen]);

  const loadAccounts = useCallback(() => {
    if (!user) return;

    setAccountsStatus("loading");
    setAccountsError("");

    listAccounts()
      .then((rows) => {
        setAccounts(rows);
        setAccountsStatus("ready");
      })
      .catch((error) => {
        console.error("[dashboard] Could not load accounts:", error);
        setAccountsError(
          authErrorMessage(
            error,
            "We couldn't load the accounts from Firebase right now."
          )
        );
        setAccountsStatus("error");
      });
  }, [user]);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  if (!authReady) {
    return (
      <div className="dashboard-page dash-loading" aria-live="polite">
        <span className="spinner" />
        <p>Loading your dashboard…</p>
      </div>
    );
  }

  if (!user) {
    if (signingOut) {
      return (
        <div className="dashboard-page dash-loading" aria-live="polite">
          <span className="spinner" />
          <p>Signing you out…</p>
        </div>
      );
    }

    return <Navigate to="/login" replace />;
  }

  const name = String(user.name || "Student");
  const studentId = display(user.studentId);
  const firstName = name.trim().split(/\s+/)[0];
  const avatar = initials(name) || "S";
  const activeView = VIEW_TITLES[view] || "Dashboard";

  const switchView = (next) => {
    if (!VIEW_TITLES[next]) return;
    setMobileNavOpen(false);

    if (view === next) {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      return;
    }

    if (window.location.hash === `#${next}`) {
      setView(next);
      return;
    }

    window.location.hash = next;
  };

  const toggleNav = () => {
    if (isMobile) {
      setMobileNavOpen((open) => !open);
      return;
    }

    setNavClosed((closed) => {
      const next = !closed;
      try {
        window.localStorage.setItem(NAV_KEY, next ? "closed" : "open");
      } catch {
        // ignore private-mode storage failures
      }
      return next;
    });
  };

  const handleLogout = async () => {
    setSigningOut(true);

    try {
      await logout();
    } catch (error) {
      console.error("[dashboard] Logout failed:", error);
    }

    toast("Signed out", "You have been logged out of PayTrack.", "info");
    navigate("/");
  };

  const navOpen = isMobile ? mobileNavOpen : !navClosed;

  return (
    <div className="dashboard-page">
      <div
        className={`dash-shell${navClosed ? " is-nav-closed" : ""}${
          mobileNavOpen ? " is-nav-open" : ""
        }`}
      >
        <aside className="side-nav" id="dash-side-nav" aria-label="Dashboard navigation">
          <div className="side-nav__head">
            <Brand to="/" className="side-brand" />
            <button
              className="side-close"
              type="button"
              aria-label="Hide navigation"
              onClick={() => setMobileNavOpen(false)}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>

          <nav className="side-links" aria-label="Dashboard tabs">
            <a
              className={`side-link${view === "students" ? " is-active" : ""}`}
              href="#students"
              aria-current={view === "students" ? "page" : undefined}
              onClick={(event) => {
                event.preventDefault();
                switchView("students");
              }}
            >
              <NavIcon name="students" />
              Students
            </a>
            <a
              className={`side-link${view === "accounts" ? " is-active" : ""}`}
              href="#accounts"
              aria-current={view === "accounts" ? "page" : undefined}
              onClick={(event) => {
                event.preventDefault();
                switchView("accounts");
              }}
            >
              <NavIcon name="accounts" />
              Accounts
            </a>
          </nav>

          <div className="side-nav__foot">
            <button className="side-logout" type="button" onClick={handleLogout}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <path d="m16 17 5-5-5-5M21 12H9" />
              </svg>
              Log out
            </button>
          </div>
        </aside>

        <div
          className="side-scrim"
          hidden={!mobileNavOpen}
          onClick={() => setMobileNavOpen(false)}
        />

        <div className="dash-wrap">
          <header className="top-bar">
            <button
              className="nav-btn"
              type="button"
              onClick={toggleNav}
              aria-controls="dash-side-nav"
              aria-expanded={navOpen}
              aria-label={navOpen ? "Hide navigation" : "Show navigation"}
            >
              <svg className="nav-btn__open" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
                <path d="M4 7h16M4 12h16M4 17h16" />
              </svg>
              <svg className="nav-btn__close" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>

            <div className="top-bar__meta">
              <span className="top-bar__eyebrow">Student portal</span>
              <strong>{activeView}</strong>
            </div>

            <div className="top-bar__user">
              <span className="top-avatar" aria-hidden="true">
                {avatar}
              </span>
              <div className="top-user__copy">
                <strong>{name}</strong>
                <span>{studentId}</span>
              </div>
            </div>
          </header>

          <main className="dash-content">
            {view === "students" ? (
              <StudentsPanel />
            ) : (
              <section className="dash-view" aria-label="Accounts">
                <div className="view-head">
                  <div>
                    <h1>Accounts</h1>
                  </div>
                  <span className="dash-count">
                    {accountsStatus === "ready"
                      ? `${accounts.length} ${
                          accounts.length === 1 ? "account" : "accounts"
                        }`
                      : "Loading…"}
                  </span>
                </div>

                <div className="accounts-table-wrap">
                  {accountsStatus === "loading" ? (
                    <div className="accounts-empty" aria-live="polite">
                      <p>
                        <span className="spinner" /> Loading accounts from Firebase…
                      </p>
                    </div>
                  ) : null}

                  {accountsStatus === "error" ? (
                    <div className="accounts-empty">
                      <p>{accountsError}</p>
                      <button
                        type="button"
                        className="link-quiet"
                        onClick={loadAccounts}
                      >
                        Try again
                      </button>
                    </div>
                  ) : null}

                  {accountsStatus === "ready" ? (
                    <div className="accounts-table-scroll">
                      <table className="accounts-table registry-table">
                        <thead>
                          <tr>
                            <th scope="col">Full Name</th>
                            <th scope="col">Student ID</th>
                            <th scope="col">Position</th>
                            <th scope="col">Year Level</th>
                            <th scope="col">Institute</th>
                            <th scope="col">Program</th>
                          </tr>
                        </thead>
                        <tbody>
                          {accounts.map((account) => (
                            <tr
                              key={account.uid}
                              className={account.uid === user.uid ? "is-you" : undefined}
                              title={
                                account.uid === user.uid
                                  ? "This is your account"
                                  : undefined
                              }
                            >
                              <td className="cell-name">{display(account.name)}</td>
                              <td>{display(account.studentId)}</td>
                              <td className="cell-position">
                                {display(account.position)}
                              </td>
                              <td>{display(account.yearLevel)}</td>
                              <td>{display(account.institute)}</td>
                              <td>{display(account.program)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : null}

                  {accountsStatus === "ready" && !accounts.length ? (
                    <div className="accounts-empty">
                      <p>No accounts created yet.</p>
                      <Link to="/signup">Create an account</Link>
                    </div>
                  ) : null}
                </div>
              </section>
            )}
          </main>

          <footer className="dash-foot">
            <span>
              Tangub City Global College ·{" "}
              {INSTITUTE_ORGANIZATIONS[user.institute] ||
                user.institute ||
                "Student Portal"}
            </span>
            <Link to="/">Back to public site</Link>
          </footer>
        </div>
      </div>
    </div>
  );
}
