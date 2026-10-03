import { initializeApp } from "firebase/app";

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
      { ...config, apiKey: config.apiKey || "demo-key", projectId: "demo-pinweb" }
    : config,
);
