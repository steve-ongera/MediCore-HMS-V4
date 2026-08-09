// src/hooks/useIdleLogout.js
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

const IDLE_LIMIT_MS = 5 * 60 * 1000;
const WARNING_MS = 60 * 1000; // show the warning modal 1 minute before logout
const ACTIVE_TIMEOUT_MS = IDLE_LIMIT_MS - WARNING_MS;

export default function useIdleLogout() {
  const { logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const warnTimerRef = useRef(null);
  const logoutTimerRef = useRef(null);
  const countdownIntervalRef = useRef(null);

  const [showWarning, setShowWarning] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(WARNING_MS / 1000);

  const clearAllTimers = () => {
    if (warnTimerRef.current) clearTimeout(warnTimerRef.current);
    if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
  };

  const doLogout = useCallback(async () => {
    clearAllTimers();
    setShowWarning(false);
    await logout();
    navigate("/login", { replace: true, state: { reason: "idle" } });
  }, [logout, navigate]);

  const startWarning = useCallback(() => {
    setShowWarning(true);
    setSecondsRemaining(WARNING_MS / 1000);

    countdownIntervalRef.current = setInterval(() => {
      setSecondsRemaining((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);

    logoutTimerRef.current = setTimeout(doLogout, WARNING_MS);
  }, [doLogout]);

  // Restarts the "still active" phase — used both on normal activity events
  // and when the user explicitly clicks "Stay signed in" from the warning.
  const resetActiveTimer = useCallback(() => {
    clearAllTimers();
    setShowWarning(false);
    warnTimerRef.current = setTimeout(startWarning, ACTIVE_TIMEOUT_MS);
  }, [startWarning]);

  // The button the warning modal calls — explicit confirmation only,
  // never triggered by passive mouse/scroll activity while warning is shown.
  const staySignedIn = useCallback(() => {
    resetActiveTimer();
  }, [resetActiveTimer]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const events = ["mousemove", "keydown", "click", "scroll", "touchstart"];

    // While the warning modal is showing, passive activity is intentionally
    // ignored — only the explicit "Stay signed in" click (staySignedIn)
    // resets the timer. This is what keeps someone from being logged out
    // just because they clicked "close" on the notification, while also
    // not letting a stray mouse jiggle silently swallow a real idle case.
    const handleActivity = () => {
      if (!showWarning) resetActiveTimer();
    };

    events.forEach((e) => window.addEventListener(e, handleActivity));
    resetActiveTimer();

    return () => {
      events.forEach((e) => window.removeEventListener(e, handleActivity));
      clearAllTimers();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, showWarning, resetActiveTimer]);

  return { showWarning, secondsRemaining, staySignedIn };
}