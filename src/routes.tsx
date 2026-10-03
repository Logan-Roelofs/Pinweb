import { createBrowserRouter } from "react-router";
import Layout from "./components/Layout";
import Home from "./pages/public/Home";
import NotFound from "./pages/public/NotFound";

export const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { index: true, element: <Home /> },
      { path: "*", element: <NotFound /> },
    ],
  },
]);
