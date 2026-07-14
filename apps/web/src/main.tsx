import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { AuthProvider } from "./auth/AuthProvider";
import { AppErrorBoundary } from "./components/AppErrorBoundary";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode><AppErrorBoundary><AuthProvider><App /></AuthProvider></AppErrorBoundary></StrictMode>
);
