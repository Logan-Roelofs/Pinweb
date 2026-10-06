import type { Analytics } from "firebase/analytics";
import { app, useEmulators } from "./firebase";

/**
 * Google Analytics (GA4) through Firebase.
 *
 * Off unless VITE_FIREBASE_MEASUREMENT_ID is set, and never on the local
 * emulators or localhost. Loaded after the page has shown so it doesn't slow
 * the site down. GA4 records page views (including moving between pages in
 * the app) and clicks on links to other sites by itself; searches are logged
 * with logSearch(). Visits by the signed-in admin aren't counted.
 */
const enabled =
  !!app.options.measurementId &&
  !useEmulators &&
  !["localhost", "127.0.0.1"].includes(location.hostname);

let analytics: Promise<Analytics | null> | null = null;

function load(): Promise<Analytics | null> {
  analytics ??= import("firebase/analytics").then(async ({ getAnalytics, isSupported }) =>
    (await isSupported()) ? getAnalytics(app) : null,
  );
  return analytics;
}

/**
 * Called once sign-in has been checked (and whenever it changes). Visitors
 * are counted; the signed-in admin isn't. Analytics only starts after the
 * sign-in check, so even the admin's first page view isn't recorded.
 */
export function updateAnalytics(isAdmin: boolean) {
  if (!enabled) return;
  if (isAdmin && !analytics) return; // never started for the admin
  const go = () =>
    load()
      .then(async (a) => {
        if (!a) return;
        const { setAnalyticsCollectionEnabled } = await import("firebase/analytics");
        setAnalyticsCollectionEnabled(a, !isAdmin);
      })
      .catch(() => {});
  // After the page has finished loading, so it never slows the site down.
  if (document.readyState === "complete") go();
  else window.addEventListener("load", go, { once: true });
}

/** Records what a visitor searched for (GA4's standard "search" event). */
export function logSearch(term: string) {
  // Only once analytics is running for a visitor (never for the admin).
  if (!enabled || !analytics || !term.trim()) return;
  analytics
    .then(async (a) => {
      if (!a) return;
      const { logEvent } = await import("firebase/analytics");
      logEvent(a, "search", { search_term: term.trim().toLowerCase().slice(0, 100) });
    })
    .catch(() => {});
}
