import React from "react";

const TOKEN_KEY = "senaf:access_token";

function readToken() {
  try {
    return localStorage.getItem(TOKEN_KEY) || "";
  } catch {
    return "";
  }
}

function writeToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    // ignore
  }
}

function parseJwt(token) {
  if (!token) return null;
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
    return payload || null;
  } catch {
    return null;
  }
}

function isExpired(payload) {
  if (!payload?.exp) return false;
  return Date.now() >= payload.exp * 1000;
}

const Ctx = React.createContext(null);

function useLocalAuthStore() {
  const [token, setToken] = React.useState(() => readToken());
  const [payload, setPayload] = React.useState(() => parseJwt(readToken()));
  const [error, setError] = React.useState(null);

  const clearSession = React.useCallback(() => {
    writeToken("");
    setToken("");
    setPayload(null);
  }, []);

  const setLocalSession = React.useCallback((nextToken) => {
    writeToken(nextToken || "");
    setToken(nextToken || "");
    setPayload(parseJwt(nextToken || ""));
  }, []);

  React.useEffect(() => {
    if (!payload) return;
    if (isExpired(payload)) clearSession();
  }, [payload, clearSession]);

  React.useEffect(() => {
    const onStorage = (ev) => {
      if (ev.key !== TOKEN_KEY) return;
      const tk = readToken();
      setToken(tk);
      setPayload(parseJwt(tk));
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const isAuthenticated = !!token && !!payload && !isExpired(payload);
  const user = isAuthenticated
    ? {
        sub: payload.sub || null,
        email: payload.email || null,
        name: payload.name || null,
      }
    : null;

  const getAccessTokenSilently = React.useCallback(async () => {
    const tk = readToken();
    const pl = parseJwt(tk);
    if (!tk || !pl || isExpired(pl)) {
      throw new Error("No hay sesión activa");
    }
    return tk;
  }, []);

  const loginWithRedirect = React.useCallback(async () => {
    const current = `${window.location.pathname}${window.location.search}`;
    try {
      sessionStorage.setItem("auth:returnTo", current);
    } catch {
      // ignore
    }
    if (window.location.pathname !== "/login") {
      window.location.assign("/login");
    }
  }, []);

  const logout = React.useCallback(async (opts = {}) => {
    clearSession();
    const rt = opts?.logoutParams?.returnTo || `${window.location.origin}/login`;
    window.location.assign(rt);
  }, [clearSession]);

  return {
    isLoading: false,
    isAuthenticated,
    user,
    error,
    getAccessTokenSilently,
    loginWithRedirect,
    logout,
    setLocalSession,
    clearSession,
    setError,
  };
}

export function Auth0Provider({ children }) {
  const value = useLocalAuthStore();
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function LocalAuthProvider({ children }) {
  return <Auth0Provider>{children}</Auth0Provider>;
}

export function useAuth0() {
  const ctx = React.useContext(Ctx);
  if (!ctx) {
    throw new Error("useAuth0 debe usarse dentro de LocalAuthProvider");
  }
  return ctx;
}

