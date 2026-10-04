import { useState, type FormEvent } from "react";
import { useAuth } from "../../hooks/useAuth";
import { errorMessage } from "../../lib/writes";
import MatrixRain from "../../components/MatrixRain";

export default function Login() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await signIn(email, password);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden px-4">
      <MatrixRain className="opacity-30" />
      <form onSubmit={submit} className="card relative w-full max-w-sm space-y-4 p-6 shadow-glow">
        <div>
          <p className="font-mono text-xs text-muted">&gt; authenticate</p>
          <h1 className="mt-1 text-2xl font-bold text-glow">LOGAN'S BALLS<span className="text-muted">/admin</span></h1>
        </div>
        <div>
          <label className="label" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            className="input"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="label" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            className="input"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        {error && <p className="text-sm text-red-300">Login failed: {error}</p>}
        <button type="submit" className="btn btn-primary w-full" disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}
        </button>
        <p className="text-xs text-muted">You'll stay signed in on this device until you sign out.</p>
      </form>
    </div>
  );
}
