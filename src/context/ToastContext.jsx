import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

const ToastContext = createContext(null);

const ICONS = {
  success: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="m8.5 12.2 2.3 2.3 4.7-4.9" />
    </svg>
  ),
  error: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5v5M12 16.5h.01" />
    </svg>
  ),
  info: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5.5M12 7.6h.01" />
    </svg>
  ),
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const nextId = useRef(0);
  const timers = useRef(new Map());

  useEffect(() => {
    const currentTimers = timers.current;
    return () => {
      currentTimers.forEach((timer) => window.clearTimeout(timer));
    };
  }, []);

  const dismiss = useCallback((id) => {
    const autoTimer = timers.current.get(`auto-${id}`);
    if (autoTimer) {
      window.clearTimeout(autoTimer);
      timers.current.delete(`auto-${id}`);
    }

    setToasts((current) =>
      current.map((toast) => (toast.id === id ? { ...toast, hiding: true } : toast))
    );

    const timer = window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
      timers.current.delete(id);
    }, 240);
    timers.current.set(id, timer);
  }, []);

  const toast = useCallback(
    (title, message, type = "info") => {
      const id = ++nextId.current;
      setToasts((current) => [...current, { id, title, message, type, hiding: false }]);

      const autoTimer = window.setTimeout(() => dismiss(id), 5500);
      timers.current.set(`auto-${id}`, autoTimer);
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="toast-stack" role="status" aria-live="polite">
        {toasts.map((item) => (
          <div
            className={`toast toast--${item.type}${item.hiding ? " is-hiding" : ""}`}
            key={item.id}
          >
            <span className="toast__icon">{ICONS[item.type] || ICONS.info}</span>
            <div className="toast__body">
              <strong>{item.title}</strong>
              {item.message ? <p>{item.message}</p> : null}
            </div>
            <button
              className="toast__close"
              type="button"
              aria-label="Dismiss notification"
              onClick={() => dismiss(item.id)}
            >
              &times;
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used inside ToastProvider");
  }
  return context;
}
