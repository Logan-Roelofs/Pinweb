import { createStore, keys } from "idb-keyval";

/**
 * The site's real address. Firebase also serves it on its default addresses
 * (<project>.web.app and <project>.firebaseapp.com); visitors there are sent
 * to the real domain so everyone uses one address.
 */
export const SITE_ORIGIN = "https://logansballs.com";

const FIREBASE_DEFAULT_HOST = /\.(web\.app|firebaseapp\.com)$/;

/**
 * Moves visitors from a Firebase default address to logansballs.com, keeping
 * the path. Browsers keep on-device data per address, so it holds off while
 * this address still has photos waiting to upload or note text not yet
 * synced; those finish here first, and the next visit moves over.
 */
export async function moveToSiteDomain(): Promise<void> {
  if (!FIREBASE_DEFAULT_HOST.test(location.hostname)) return;
  try {
    const notesWaiting = Object.keys(localStorage).some((k) => k.startsWith("pinweb:note:"));
    // Same on-device upload queue as lib/uploadQueue.ts.
    const photosWaiting = (await keys(createStore("pinweb-uploads", "items"))).length > 0;
    if (notesWaiting || photosWaiting) return;
  } catch {
    // Storage unavailable (e.g. private mode): nothing can be waiting, so it's safe to move.
  }
  location.replace(SITE_ORIGIN + location.pathname + location.search + location.hash);
}
