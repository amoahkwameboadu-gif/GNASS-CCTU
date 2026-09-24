import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";

// Enables the scroll-reveal styles (same flag the original script.js set).
document.documentElement.classList.add("js-enabled");

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
