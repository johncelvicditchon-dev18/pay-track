import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import Brand from "../components/Brand";
import { useAuth } from "../context/AuthContext";
import { authErrorMessage, listAccounts } from "../lib/auth";

function display(value) {
  const text = String(value || "").trim();
  return text || "—";
}

export default function Accounts() {
  const { user, authReady } = useAuth();
  const [users, setUsers] = useState([]);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!authReady) return undefined;
    if (!user) {
      setStatus("idle");
      return undefined;
    }

    let active = true;
    setStatus("loading");
    setError("");

    listAccounts()
      .then((accounts) => {
        if (!active) return;
        setUsers(accounts);
        setStatus("ready");
      })
      .catch((loadError) => {
        if (!active) return;
        console.error("[accounts] Could not load accounts:", loadError);
        setError(
          authErrorMessage(
            loadError,
            "We couldn't load the accounts from Firebase right now."
          )
        );
        setStatus("error");
      });

    return () => {
      active = false;
    };
  }, [authReady, user, reloadKey]);

  if (authReady && !user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="accounts-page">
      <header className="dash-header">
        <div className="container dash-header__inner">
          <Brand to="/" />
        </div>
      </header>

      <main className="container dash-main">
        <div className="dash-head">
          <div>
            <p className="dash-eyebrow">Student accounts</p>
            <h1>Accounts</h1>
          </div>
          <span className="dash-count">
            {status === "ready"
              ? `${users.length} ${users.length === 1 ? "account" : "accounts"}`
              : "Loading…"}
          </span>
        </div>

        <div className="accounts-table-wrap">
          {status === "loading" ? (
            <div className="accounts-empty" aria-live="polite">
              <p>
                <span className="spinner" /> Loading accounts from Firebase…
              </p>
            </div>
          ) : null}

          {status === "error" ? (
            <div className="accounts-empty">
              <p>{error}</p>
              <button
                type="button"
                className="link-quiet"
                onClick={() => setReloadKey((key) => key + 1)}
              >
                Try again
              </button>
            </div>
          ) : null}

          {status === "ready" ? (
            <div className="accounts-table-scroll">
              <table className="accounts-table">
                <thead>
                  <tr>
                    <th scope="col">Full Name</th>
                    <th scope="col">Student ID</th>
                    <th scope="col">Position</th>
                    <th scope="col">Year Level</th>
                    <th scope="col">Council / Organization</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((account) => (
                    <tr key={account.uid}>
                      <td className="cell-name">{display(account.name)}</td>
                      <td>{display(account.studentId)}</td>
                      <td className="cell-position">{display(account.position)}</td>
                      <td>{display(account.yearLevel)}</td>
                      <td>{display(account.council)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}

          {status === "ready" && !users.length ? (
            <div className="accounts-empty">
              <p>No accounts created yet.</p>
              <Link to="/signup">Create an account</Link>
            </div>
          ) : null}
        </div>
      </main>
    </div>
  );
}
