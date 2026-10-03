/**
 * Firestore writes made with the offline cache resolve only once the server
 * confirms them, which never happens while offline. So the UI doesn't wait on
 * them. Instead each write is "tracked" here, and failures (e.g. a rule
 * rejection) are reported to whoever is listening, usually the toast area.
 */
type Listener = (message: string) => void;

const listeners = new Set<Listener>();

export function onWriteError(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function reportError(message: string, error?: unknown) {
  if (error) console.error(message, error);
  listeners.forEach((l) => l(message));
}

export function trackWrite<T>(promise: Promise<T>, what: string): Promise<T> {
  promise.catch((err) => reportError(`Couldn't save ${what}: ${errorMessage(err)}`, err));
  return promise;
}

export function errorMessage(err: unknown): string {
  if (err && typeof err === "object" && "code" in err) {
    const code = String((err as { code: string }).code);
    if (code.endsWith("permission-denied") || code.endsWith("unauthorized")) return "permission denied";
    if (code === "auth/invalid-credential" || code === "auth/wrong-password" || code === "auth/user-not-found")
      return "wrong email or password";
    if (code === "auth/too-many-requests") return "too many attempts, try again in a few minutes";
    if (code === "auth/network-request-failed") return "no internet connection";
    return code;
  }
  return err instanceof Error ? err.message : String(err);
}
