import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter } from "react-router-dom";
import App from "./App";
import "./index.css";

/**
 * Main entry point for the Guide on the Side React application.
 * 
 * Uses HashRouter instead of BrowserRouter for WordPress compatibility.
 * HashRouter uses URL hash (#/) for routing, which works within
 * the WordPress admin page without conflicting with WP's routing.
 */

// Find the root element - try gots-root first (WordPress), then root (dev)
const rootElement = document.getElementById("gots-root") || document.getElementById("root");

if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <HashRouter>
        <App />
      </HashRouter>
    </React.StrictMode>
  );
} else {
  console.error("Guide on the Side: Root element not found");
}
