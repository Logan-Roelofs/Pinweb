import { connectAuthEmulator, getAuth } from "firebase/auth";
import { app, useEmulators } from "./firebase";

/** Auth keeps the session in IndexedDB by default, so you stay logged in. */
export const auth = getAuth(app);

if (useEmulators) connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });

export { onAuthStateChanged, signInWithEmailAndPassword, signOut } from "firebase/auth";
