import { initializeApp } from "firebase/app";
import { connectAuthEmulator, getAuth } from "firebase/auth";
import {
  connectFirestoreEmulator,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from "firebase/firestore";
import { connectStorageEmulator, getStorage } from "firebase/storage";

/**
 * Firebase web config comes from Vite env vars (.env locally, GitHub
 * repository variables in CI). These values are not secret, since they ship
 * to every visitor's browser, but we keep them out of git so the repo isn't
 * tied to one project. Security comes from the Firestore/Storage rules.
 */
const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

/** True when running against the local Firebase Emulator Suite. */
export const useEmulators = import.meta.env.VITE_USE_EMULATORS === "true";

export const app = initializeApp(
  useEmulators
    ? // The emulators accept any values; "demo-" project IDs never touch real Firebase.
      {
        ...config,
        apiKey: config.apiKey || "demo-key",
        projectId: "demo-pinweb",
        storageBucket: "demo-pinweb.appspot.com",
      }
    : config,
);

/** Auth keeps the session in IndexedDB by default, so you stay logged in. */
export const auth = getAuth(app);

/**
 * Firestore with a persistent offline cache: reads work offline and writes
 * are queued in IndexedDB until the device is back online, even across
 * closing the app. The multi-tab manager lets several open tabs share it.
 */
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
});

export const storage = getStorage(app);
// Give up on a stalled upload after 1 minute (default: 10) so the upload
// queue can mark it failed and retry later, instead of hanging on bad signal.
storage.maxUploadRetryTime = 60_000;

if (useEmulators) {
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
  connectStorageEmulator(storage, "127.0.0.1", 9199);
}
