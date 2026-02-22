// client/src/main.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import "./styles.css";
import { LocalAuthProvider } from "./auth/local-auth-react.jsx";
import { Toaster } from 'sonner'

/**
 * Presets globales UI
 */
(function bootstrapUiTokens() {
  try {
    const el = document.documentElement;

    if (!el.getAttribute("data-fx")) el.setAttribute("data-fx", "neon");
    if (!el.getAttribute("data-aurora")) el.setAttribute("data-aurora", "medio");
  } catch {
    // ignore
  }
})();

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Toaster position="bottom-left" expand={true} richColors/>
    <BrowserRouter>
      <LocalAuthProvider>
        <App />
      </LocalAuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
