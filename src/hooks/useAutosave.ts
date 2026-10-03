import { useCallback, useEffect, useRef, useState } from "react";

export type SaveStatus = "idle" | "pending" | "saving" | "saved" | "offline" | "error";

/**
 * Saves `value` automatically a short moment after it stops changing, and
 * immediately when the page is hidden or closed (switching apps, locking the
 * phone) or the component unmounts. No save button needed.
 *
 * `save` should start the write and return its promise. With Firestore's
 * offline cache the write is stored on the device right away; the promise
 * only settles once the server confirms, so while offline we report "offline".
 */
export function useAutosave<T>(value: T, save: (value: T) => Promise<unknown>, delayMs = 800) {
  const [status, setStatus] = useState<SaveStatus>("idle");
  const saveRef = useRef(save);
  saveRef.current = save;
  const lastSaved = useRef(value);
  const latest = useRef(value);
  latest.current = value;
  const timer = useRef<number | undefined>(undefined);

  const flush = useCallback(() => {
    window.clearTimeout(timer.current);
    timer.current = undefined;
    const current = latest.current;
    if (Object.is(current, lastSaved.current)) return;
    lastSaved.current = current;

    setStatus(navigator.onLine ? "saving" : "offline");
    saveRef.current(current).then(
      () => {
        if (Object.is(lastSaved.current, current)) setStatus("saved");
      },
      () => setStatus("error"),
    );
  }, []);

  useEffect(() => {
    if (Object.is(value, lastSaved.current)) return;
    setStatus("pending");
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(flush, delayMs);
  }, [value, delayMs, flush]);

  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === "hidden") flush();
    };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", flush);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", flush);
      flush();
    };
  }, [flush]);

  return { status, flush };
}

export function saveStatusLabel(status: SaveStatus): string {
  switch (status) {
    case "pending":
    case "saving":
      return "Saving…";
    case "saved":
      return "Saved";
    case "offline":
      return "Saved on device · will sync when online";
    case "error":
      return "Save failed";
    default:
      return "";
  }
}
