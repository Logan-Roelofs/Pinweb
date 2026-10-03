import { Link } from "react-router";

export default function NotFound() {
  return (
    <div className="py-16 text-center">
      <h1 className="text-4xl font-bold text-glow">TILT</h1>
      <p className="mt-4 text-muted">That page drained down the outlane.</p>
      <Link to="/" className="mt-6 inline-block font-mono">&gt; back to home</Link>
    </div>
  );
}
