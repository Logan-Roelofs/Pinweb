import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { User } from "firebase/auth";
import { ADMIN_UID } from "../lib/admin";

interface AuthState {
  /** Undefined until Firebase has restored any saved session. */
  user: User | null | undefined;
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

/** Firebase Auth is loaded in the background, so the public pages show without waiting for it. */
const loadAuth = () => import("../lib/auth");

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null | undefined>(undefined);

  useEffect(() => {
    let unsubscribe = () => {};
    let cancelled = false;
    loadAuth().then(({ auth, onAuthStateChanged }) => {
      if (!cancelled) unsubscribe = onAuthStateChanged(auth, setUser);
    });
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  const value: AuthState = {
    user,
    isAdmin: user?.uid === ADMIN_UID,
    signIn: async (email, password) => {
      const { auth, signInWithEmailAndPassword } = await loadAuth();
      await signInWithEmailAndPassword(auth, email.trim(), password);
    },
    signOut: async () => {
      const { auth, signOut } = await loadAuth();
      await signOut(auth);
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
