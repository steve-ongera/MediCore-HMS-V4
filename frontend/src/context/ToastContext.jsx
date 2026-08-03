//src/context/ToastContext.jsx
import { useEffect, useState } from "react";
import "./toast.css";

const DEFAULT_DURATION = 4000;
const EXIT_DURATION = 220; // must match the CSS exit animation duration

const ICONS = {
  success: "bi-check-circle-fill",
  danger: "bi-x-circle-fill",
  warning: "bi-exclamation-triangle-fill",
  info: "bi-info-circle-fill",
};

// ---- module-level store (lives outside React, like react-toastify) ----
let toasts = [];
let idCounter = 0;
const timers = new Map();
const listeners = new Set();

function emit() {
  listeners.forEach((fn) => fn(toasts));
}

function removeToast(id) {
  toasts = toasts.map((t) => (t.id === id ? { ...t, leaving: true } : t));
  emit();

  const existing = timers.get(id);
  if (existing) clearTimeout(existing);

  const exitTimer = setTimeout(() => {
    toasts = toasts.filter((t) => t.id !== id);
    timers.delete(id);
    emit();
  }, EXIT_DURATION);

  timers.set(id, exitTimer);
}

function addToast({ type = "info", title, description, duration = DEFAULT_DURATION } = {}) {
  const id = ++idCounter;
  toasts = [...toasts, { id, type, title, description, duration, leaving: false }];
  emit();

  if (duration !== 0) {
    const timer = setTimeout(() => removeToast(id), duration);
    timers.set(id, timer);
  }
  return id;
}

// Public API — import this directly anywhere, just like react-toastify's `toast`.
export const toast = {
  show: addToast,
  success: (title, description, opts) => addToast({ type: "success", title, description, ...opts }),
  danger: (title, description, opts) => addToast({ type: "danger", title, description, ...opts }),
  error: (title, description, opts) => addToast({ type: "danger", title, description, ...opts }),
  warning: (title, description, opts) => addToast({ type: "warning", title, description, ...opts }),
  info: (title, description, opts) => addToast({ type: "info", title, description, ...opts }),
  dismiss: removeToast,
};

// Kept for any file that already calls useToast() — just returns the same object.
export function useToast() {
  return toast;
}

// ---- Provider: mounted once at the root, renders whatever's in the store ----
export function ToastProvider({ children }) {
  const [state, setState] = useState(toasts);

  useEffect(() => {
    listeners.add(setState);
    return () => listeners.delete(setState);
  }, []);

  return (
    <>
      {children}
      <div className="toast-stack" role="region" aria-live="polite" aria-label="Notifications">
        {state.map((t) => (
          <div key={t.id} className={`toast tone-${t.type} ${t.leaving ? "toast--leaving" : ""}`} role="status">
            <span className="toast__icon-wrap">
              <i className={`bi ${ICONS[t.type] || ICONS.info} toast__icon`} aria-hidden="true" />
            </span>
            <div className="toast__body">
              {t.title && <div className="toast__title">{t.title}</div>}
              {t.description && <div className="toast__desc">{t.description}</div>}
            </div>
            <button
              type="button"
              className="toast__close"
              aria-label="Dismiss notification"
              onClick={() => removeToast(t.id)}
            >
              <i className="bi bi-x-lg" aria-hidden="true" />
            </button>
            {t.duration !== 0 && !t.leaving && (
              <span className="toast__progress" style={{ animationDuration: `${t.duration}ms` }} />
            )}
          </div>
        ))}
      </div>
    </>
  );
}