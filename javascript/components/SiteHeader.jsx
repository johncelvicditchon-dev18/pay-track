import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { initials } from "../lib/auth";
import Brand from "./Brand";

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

export default function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { user, logout } = useAuth();
  const toast = useToast();
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname, location.hash]);

  useEffect(() => {
    if (!menuOpen) return undefined;

    const onKeyDown = (event) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [menuOpen]);

  const firstName = String(user?.name || "Student").trim().split(/\s+/)[0];

  const handleLogout = () => {
    logout();
    toast("Signed out", "You have been logged out of PayTrack.", "info");
  };

  return (
    <header className={`site-header${scrolled ? " is-scrolled" : ""}`} id="site-header">
      <div className="container header-inner">
        <Brand to="/" />

        <nav
          className={`nav${menuOpen ? " is-open" : ""}`}
          id="primary-nav"
          aria-label="Primary"
        >
          <Link to="/" onClick={() => setMenuOpen(false)}>
            Home
          </Link>
          <Link to="/#about" onClick={() => setMenuOpen(false)}>
            About
          </Link>
          <Link to="/#contact" onClick={() => setMenuOpen(false)}>
            Contact
          </Link>
          {!user ? (
            <>
              <Link className="nav-login" to="/login" onClick={() => setMenuOpen(false)}>
                Log in
              </Link>
              <Link className="nav-auth" to="/signup" onClick={() => setMenuOpen(false)}>
                Create account
              </Link>
            </>
          ) : null}
        </nav>

        <div className="header-actions">
          {user ? (
            <>
              <span className="header-user" title={user.email}>
                <span className="avatar" aria-hidden="true">
                  {initials(user.name) || "S"}
                </span>
                <span>Hi, {firstName}</span>
              </span>
              <button className="header-logout" type="button" onClick={handleLogout}>
                Log out
              </button>
            </>
          ) : (
            <>
              <Link className="header-login" to="/login">
                Log in
              </Link>
              <Link className="btn btn--light" to="/signup">
                Get started
                <ArrowIcon />
              </Link>
            </>
          )}

          <button
            className="nav-toggle"
            type="button"
            aria-expanded={menuOpen}
            aria-controls="primary-nav"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <svg
              className="icon-menu"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
            <svg
              className="icon-close"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
}
