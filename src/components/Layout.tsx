import { Link, Outlet } from "react-router";

export default function Layout() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-line bg-surface/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link to="/" className="font-mono text-xl font-bold text-matrix no-underline text-glow hover:no-underline">
            PINWEB<span className="cursor-blink">▌</span>
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
        <Outlet />
      </main>

      <footer className="border-t border-line py-6 text-center font-mono text-xs text-muted">
        &gt; insert coin to continue_
      </footer>
    </div>
  );
}
