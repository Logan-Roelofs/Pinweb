import { lazy, Suspense, type ReactNode } from "react";
import { createBrowserRouter, Navigate, useLocation } from "react-router";
import Layout from "./components/Layout";
import Home from "./pages/public/Home";
import Games from "./pages/public/Games";
import GameDetail from "./pages/public/GameDetail";
import NotFound from "./pages/public/NotFound";

// Admin pages (and the heavy text editor) load only when /admin is visited.
const AdminLayout = lazy(() => import("./pages/admin/AdminLayout"));
const AdminHome = lazy(() => import("./pages/admin/AdminHome"));
const GameList = lazy(() => import("./pages/admin/GameList"));
const GameEditor = lazy(() => import("./pages/admin/GameEditor"));

const loading = <p className="p-8 text-center font-mono text-muted">&gt; loading…</p>;
const page = (el: ReactNode) => <Suspense fallback={loading}>{el}</Suspense>;

/** Old /search links → the games page, keeping ?q= and ?tag=. */
function SearchRedirect() {
  const { search } = useLocation();
  return <Navigate to={`/games${search}`} replace />;
}

export const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { index: true, element: <Home /> },
      { path: "games", element: <Games /> },
      { path: "games/:id", element: <GameDetail /> },
      { path: "search", element: <SearchRedirect /> },
      { path: "*", element: <NotFound /> },
    ],
  },
  {
    path: "/admin",
    element: page(<AdminLayout />),
    children: [
      { index: true, element: page(<AdminHome />) },
      { path: "games", element: page(<GameList />) },
      // "games/new" opens the editor empty (see GameEditor).
      { path: "games/:id", element: page(<GameEditor />) },
    ],
  },
]);
