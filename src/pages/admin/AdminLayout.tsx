import { Link, NavLink, Outlet } from "react-router";
import { useAuth } from "../../hooks/useAuth";
import Toasts from "../../components/Toasts";
import Login from "./Login";

/** Wraps every /admin page: shows the login form until the admin is signed in. */
export default function AdminLayout() {
  const { user, isAdmin, signOut } = useAuth();

  if (user === undefined) {
    return <p className="p-8 text-center font-mono text-muted">&gt; restoring session…</p>;
  }
  if (!user) return <Login />;
  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-md p-8 text-center">
        <h1 className="text-2xl font-bold">Access denied</h1>
        <p className="mt-3 text-muted">This account isn't the site admin.</p>
        <button className="btn mt-6" onClick={signOut}>
          Sign out
        </button>
      </div>
    );
  }

  const tab = ({ isActive }: { isActive: boolean }) =>
    `rounded-md px-3 py-2 font-mono text-sm no-underline hover:no-underline ${
      isActive ? "bg-matrix/10 text-matrix" : "text-muted hover:text-text"
    }`;

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-20 border-b border-line bg-surface/90 backdrop-blur">
        <div className="mx-auto grid max-w-5xl grid-cols-[1fr_auto] items-center gap-x-2 gap-y-1 px-4 py-2 sm:grid-cols-[auto_1fr_auto]">
          <Link to="/admin" className="mr-2 font-mono font-bold text-matrix no-underline text-glow hover:no-underline">
            PINWEB<span className="text-muted">/admin</span>
          </Link>
          <nav className="order-last col-span-2 flex gap-1 sm:order-none sm:col-span-1">
            <NavLink to="/admin" end className={tab}>
              Home
            </NavLink>
            <NavLink to="/admin/strategies" className={tab}>
              Strategies
            </NavLink>
            <NavLink to="/admin/games" className={tab}>
              Games
            </NavLink>
          </nav>
          <div className="flex gap-2">
            <Link to="/" className="btn btn-sm">
              View site
            </Link>
            <button className="btn btn-sm" onClick={signOut}>
              Sign out
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">
        <Outlet />
      </main>
      <Toasts />
    </div>
  );
}
