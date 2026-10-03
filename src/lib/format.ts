import type { Timestamp } from "firebase/firestore";

export function timeAgo(ts: Timestamp | null | undefined): string {
  if (!ts) return "just now";
  const seconds = Math.round((Date.now() - ts.toMillis()) / 1000);
  if (seconds < 60) return "just now";
  const units: [number, string][] = [
    [60 * 60 * 24 * 365, "y"],
    [60 * 60 * 24 * 30, "mo"],
    [60 * 60 * 24 * 7, "w"],
    [60 * 60 * 24, "d"],
    [60 * 60, "h"],
    [60, "m"],
  ];
  for (const [size, label] of units) {
    if (seconds >= size) return `${Math.floor(seconds / size)}${label} ago`;
  }
  return "just now";
}

export function formatDate(ts: Timestamp | null | undefined): string {
  if (!ts) return "";
  return ts.toDate().toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}
