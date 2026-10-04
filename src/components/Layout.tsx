import { Link, NavLink, Outlet, useLocation } from "react-router";
import { useEffect } from "react";
import { useAuth } from "../hooks/useAuth";

export default function Layout() {
  const { isAdmin } = useAuth();
  const { pathname } = useLocation();

  // Start each new page at the top.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  const tab = ({ isActive }: { isActive: boolean }) =>
    `rounded-md px-3 py-2 font-mono text-sm no-underline hover:no-underline ${
      isActive ? "text-matrix text-glow" : "text-muted hover:text-text"
    }`;

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="safe-top sticky top-0 z-30 border-b border-line bg-bg/85 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-2 px-4 py-2">
          <Link to="/" className="font-mono text-xl font-bold text-matrix no-underline text-glow hover:no-underline">
            LOGAN'S BALLS<span className="cursor-blink">▌</span>
          </Link>
          <nav className="flex items-center gap-1">
            {isAdmin && (
              <NavLink to="/admin" className={tab}>
                Admin
              </NavLink>
            )}
            <NavLink
              to="/search"
              aria-label="Search guides"
              title="Search guides"
              className={({ isActive }) =>
                `flex size-10 items-center justify-center rounded-md transition ${
                  isActive ? "text-matrix text-glow" : "text-muted hover:text-matrix"
                }`
              }
            >
              <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" aria-hidden="true">
                <circle cx="10.5" cy="10.5" r="6.5" />
                <path d="m15.5 15.5 5 5" />
              </svg>
            </NavLink>
          </nav>
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
