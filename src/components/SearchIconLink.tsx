import { NavLink } from "react-router";

/** The 🔍 button in the top bars: opens the pinball guide search at `to`. */
export default function SearchIconLink({ to }: { to: string }) {
  return (
    <NavLink
      to={to}
      aria-label="Search guides"
      title="Search guides"
      className={({ isActive }) =>
        `flex size-10 shrink-0 items-center justify-center rounded-md transition ${
          isActive ? "text-matrix text-glow" : "text-muted hover:text-matrix"
        }`
      }
    >
      <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" aria-hidden="true">
        <circle cx="10.5" cy="10.5" r="6.5" />
        <path d="m15.5 15.5 5 5" />
      </svg>
    </NavLink>
  );
}
