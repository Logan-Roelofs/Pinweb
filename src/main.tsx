import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router";
import "@fontsource-variable/inter";
import "@fontsource/jetbrains-mono/400.css";
import "@fontsource/jetbrains-mono/700.css";
import "./index.css";
// Imported early so the browser's one-time install prompt isn't missed.
import "./lib/install";
import { router } from "./routes";
import { AuthProvider } from "./hooks/useAuth";
import UpdatePrompt from "./components/UpdatePrompt";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AuthProvider>
      <RouterProvider router={router} />
      <UpdatePrompt />
    </AuthProvider>
  </StrictMode>,
);
