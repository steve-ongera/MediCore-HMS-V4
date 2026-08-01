import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "app_fullscreen_intent";

export default function useFullscreen() {
  const [isFullscreen, setIsFullscreen] = useState(
    () => !!document.fullscreenElement
  );
  // Tracks whether the user *wants* fullscreen, even across a refresh
  // where the browser force-exits real fullscreen.
  const [wantsFullscreen, setWantsFullscreen] = useState(
    () => localStorage.getItem(STORAGE_KEY) === "1"
  );

  useEffect(() => {
    const handleChange = () => {
      const active = !!document.fullscreenElement;
      setIsFullscreen(active);
      // If the browser exited fullscreen (e.g. user pressed Escape),
      // clear the stored intent too.
      if (!active) {
        localStorage.removeItem(STORAGE_KEY);
        setWantsFullscreen(false);
      }
    };
    document.addEventListener("fullscreenchange", handleChange);
    return () => document.removeEventListener("fullscreenchange", handleChange);
  }, []);

  const enter = useCallback(async () => {
    try {
      await document.documentElement.requestFullscreen();
      localStorage.setItem(STORAGE_KEY, "1");
      setWantsFullscreen(true);
    } catch (err) {
      console.error("Failed to enter fullscreen:", err);
    }
  }, []);

  const exit = useCallback(async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      }
    } finally {
      localStorage.removeItem(STORAGE_KEY);
      setWantsFullscreen(false);
    }
  }, []);

  const toggle = useCallback(() => {
    if (document.fullscreenElement) {
      exit();
    } else {
      enter();
    }
  }, [enter, exit]);

  return { isFullscreen, wantsFullscreen, enter, exit, toggle };
}