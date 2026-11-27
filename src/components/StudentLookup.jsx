import { useState } from "react";
import { useNavigate } from "react-router-dom";

const ID_RE = /^[A-Za-z0-9][A-Za-z0-9-]{3,14}$/;

export default function StudentLookup() {
  const navigate = useNavigate();
  const [studentId, setStudentId] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (event) => {
    event.preventDefault();
    const id = studentId.trim().toUpperCase();

    if (!id) {
      setError("Enter your Student ID to track your payment.");
      return;
    }

    if (!ID_RE.test(id)) {
      setError("Enter a valid Student ID.");
      return;
    }

    setError("");
    navigate(`/student?studentId=${encodeURIComponent(id)}`);
  };

  return (
    <form
      className={`hero-track${error ? " has-error" : ""}`}
      onSubmit={handleSubmit}
      noValidate
    >
      <label className="hero-track__label" htmlFor="track-student-id">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="M7 9h4M7 13h7M15 9h2" />
        </svg>
        Track your payment
      </label>

      <div className="hero-track__row">
        <div className="hero-track__field">
          <svg
            className="hero-track__field-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <rect x="3" y="5" width="18" height="14" rx="2" />
            <path d="M7 9h4M7 13h7M15 9h2" />
          </svg>
          <input
            className="hero-track__input"
            type="text"
            id="track-student-id"
            name="studentId"
            value={studentId}
            onChange={(event) => {
              setStudentId(event.target.value);
              if (error) setError("");
            }}
            placeholder="Enter your Student ID"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck="false"
            aria-invalid={Boolean(error)}
            required
          />
        </div>
        <button className="btn btn--accent hero-track__btn" type="submit">
          Track
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="m21 21-4.3-4.3M10.5 18a7.5 7.5 0 1 0 0-15 7.5 7.5 0 0 0 0 15Z" />
          </svg>
        </button>
      </div>

      {error ? (
        <p className="hero-track__error" role="alert">
          {error}
        </p>
      ) : null}
    </form>
  );
}
