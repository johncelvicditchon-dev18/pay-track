import { Link } from "react-router-dom";

export default function Brand({ to, className = "", tabIndex }) {
  const content = (
    <>
      <img
        className="brand-logo"
        src="/logo/logo-toggle.png"
        alt="Tangub City Global College logo"
      />
      <span className="brand-text">
        <strong>TCGC PayTrack</strong>
        <span>Payment Tracking System</span>
      </span>
    </>
  );

  const classes = `brand${className ? ` ${className}` : ""}`;

  if (to) {
    return (
      <Link className={classes} to={to} aria-label="TCGC PayTrack home">
        {content}
      </Link>
    );
  }

  return (
    <span className={classes} tabIndex={tabIndex}>
      {content}
    </span>
  );
}
