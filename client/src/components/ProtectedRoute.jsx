import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth0 } from "../auth/local-auth-react.jsx";

const IS_LOCALHOST =
  typeof window !== "undefined" &&
  (window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1");

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading, getAccessTokenSilently } = useAuth0();
  const location = useLocation();

  const skipVerify =
    IS_LOCALHOST &&
    (String(import.meta.env.VITE_SKIP_VERIFY || "") === "1" ||
      String(import.meta.env.VITE_DISABLE_AUTH || "") === "1");

  const [mustChangePassword, setMustChangePassword] = React.useState(false);
  const [checkingSession, setCheckingSession] = React.useState(false);

  React.useEffect(() => {
    if (skipVerify) return;
    if (isLoading || !isAuthenticated) return;

    let alive = true;
    (async () => {
      setCheckingSession(true);
      try {
        const token = await getAccessTokenSilently();
        const base = import.meta.env.VITE_API_BASE_URL || "/api";
        const r = await fetch(
          `${String(base).replace(/\/$/, "")}/iam/v1/auth/session/me`,
          {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          },
        );
        const data = await r.json().catch(() => ({}));
        const must = !!data?.user?.mustChangePassword;
        if (alive) setMustChangePassword(must);
      } catch {
        if (alive) setMustChangePassword(false);
      } finally {
        if (alive) setCheckingSession(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [skipVerify, isLoading, isAuthenticated, getAccessTokenSilently]);

  if (skipVerify) return <>{children}</>;
  if (isLoading) return <div className="p-6">Cargando...</div>;
  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: `${location.pathname}${location.search}` }}
      />
    );
  }
  if (checkingSession) return <div className="p-6">Cargando...</div>;
  if (mustChangePassword && location.pathname !== "/change-password") {
    return <Navigate to="/change-password" replace />;
  }

  return <>{children}</>;
}
