import { lazy, Suspense, type ReactNode } from "react";
import { createBrowserRouter } from "react-router";
import Layout from "./components/Layout";
import Home from "./pages/public/Home";
import Games from "./pages/public/Games";
import GameDetail from "./pages/public/GameDetail";
import StrategyPage from "./pages/public/StrategyPage";
import Search from "./pages/public/Search";
import NotFound from "./pages/public/NotFound";

// Admin pages (and the heavy text editor) load only when /admin is visited.
const AdminLayout = lazy(() => import("./pages/admin/AdminLayout"));
const AdminHome = lazy(() => import("./pages/admin/AdminHome"));
const StrategyList = lazy(() => import("./pages/admin/StrategyList"));
const StrategyNew = lazy(() => import("./pages/admin/StrategyNew"));
const StrategyEdit = lazy(() => import("./pages/admin/StrategyEdit"));
const GameList = lazy(() => import("./pages/admin/GameList"));
const GameEdit = lazy(() => import("./pages/admin/GameEdit"));

const loading = <p className="p-8 text-center font-mono text-muted">&gt; loading…</p>;
const page = (el: ReactNode) => <Suspense fallback={loading}>{el}</Suspense>;

export const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { index: true, element: <Home /> },
      { path: "games", element: <Games /> },
      { path: "games/:id", element: <GameDetail /> },
      { path: "strategies/:id", element: <StrategyPage /> },
      { path: "search", element: <Search /> },
      { path: "*", element: <NotFound /> },
    ],
  },
  {
    path: "/admin",
    element: page(<AdminLayout />),
    children: [
      { index: true, element: page(<AdminHome />) },
      { path: "strategies", element: page(<StrategyList />) },
      { path: "strategies/new", element: page(<StrategyNew />) },
      { path: "strategies/:id", element: page(<StrategyEdit />) },
      { path: "games", element: page(<GameList />) },
      { path: "games/new", element: page(<GameEdit />) },
      { path: "games/:id", element: page(<GameEdit />) },
    ],
  },
]);
