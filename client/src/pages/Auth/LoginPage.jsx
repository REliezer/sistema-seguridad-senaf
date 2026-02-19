import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth0 } from "../../auth/local-auth-react.jsx";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "/api";

export default function LoginPage({ forceChange = false }) {
  const nav = useNavigate();
  const location = useLocation();
  const { setLocalSession } = useAuth0();

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [needChange, setNeedChange] = React.useState(!!forceChange);
  const [msg, setMsg] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  async function doLogin(e) {
    e?.preventDefault();
    setMsg("");
    setLoading(true);
    try {
      const r = await fetch(`${API_BASE}/iam/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await r.json().catch(() => ({}));

      if (!r.ok) {
        if (data?.code === "PASSWORD_CHANGE_REQUIRED") {
          setNeedChange(true);
          setMsg("Debes cambiar la contraseña para continuar.");
          return;
        }
        throw new Error(data?.error || "No se pudo iniciar sesion");
      }

      if (!data?.token) throw new Error("No se recibio token de sesion");

      setLocalSession(data.token);
      window.alert("Inicio de sesion exitoso.");

      const returnTo = (() => {
        const fromState = location?.state?.from;
        if (typeof fromState === "string" && fromState.startsWith("/")) {
          return fromState;
        }
        try {
          const raw = sessionStorage.getItem("auth:returnTo");
          return typeof raw === "string" && raw.startsWith("/") ? raw : "/start";
        } catch {
          return "/start";
        }
      })();

      nav(returnTo, { replace: true });
    } catch (err) {
      setMsg(err?.message || "Error de autenticacion");
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    if (forceChange) setNeedChange(true);
  }, [forceChange]);

  async function doChangePassword(e) {
    e?.preventDefault();
    setMsg("");

    if (forceChange && !password) {
      setMsg("Debes ingresar la contraseña actual.");
      return;
    }

    if (!newPassword || newPassword !== confirm) {
      setMsg("La nueva contraseña y la confirmaci'o'n deben coincidir.");
      return;
    }

    setLoading(true);
    try {
      const r = await fetch(`${API_BASE}/iam/v1/auth/change-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          ...(forceChange ? { currentPassword: password } : {}),
          newPassword,
        }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        throw new Error(data?.error || "No se pudo cambiar la contraseña");
      }

      if (data?.token) setLocalSession(data.token);
      window.alert("Contrasena cambiada exitosamente.");
      nav("/start", { replace: true });
    } catch (err) {
      setMsg(err?.message || "Error al cambiar contraseña");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative isolate min-h-svh grid place-items-center p-6 bg-neutral-950">
      <div className="app-bg pointer-events-none" aria-hidden />
      <div
        className="pointer-events-none fixed inset-0 z-0 bg-neutral-950/55"
        aria-hidden
      />

      <section className="relative z-10 w-full max-w-5xl overflow-hidden rounded-2xl border border-cyan-500/30 bg-black/40">
        <div className="grid md:grid-cols-2">
          <aside className="flex items-center justify-center border-b border-cyan-500/20 bg-black/30 p-8 md:border-b-0 md:border-r md:p-12">
            <img
              src="/logo.png"
              alt="SENAF Seguridad"
              className="w-full max-w-xs object-contain"
            />
          </aside>

          <form
            onSubmit={needChange ? doChangePassword : doLogin}
            className="p-6 md:p-8 space-y-3"
          >
            <h1 className="text-xl text-center font-semibold text-cyan-100">
              {needChange ? "Cambio de contraseña" : "Iniciar sesion"}
            </h1>

            <label className="block text-sm text-cyan-100/90">Correo Electronico</label>
            <input
              type="email"
              className="w-full rounded border text-cyan-100/90 border-cyan-500/40 bg-black/30 p-2"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            {!needChange && (
              <>
                <label className="block text-sm text-cyan-100/90">Contraseña</label>
                <input
                  type="password"
                  className="w-full rounded border text-cyan-100/90 border-cyan-500/40 bg-black/30 p-2"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </>
            )}

            {needChange && forceChange && (
              <>
                <label className="block text-sm text-cyan-100/90">
                  Contraseña actual
                </label>
                <input
                  type="password"
                  className="w-full rounded border text-cyan-100/90 border-cyan-500/40 bg-black/30 p-2"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </>
            )}

            {!needChange && (
              <button
                type="button"
                onClick={() => {
                  setNeedChange(true);
                  setMsg("");
                }}
                className="text-sm text-cyan-300 font-light hover:text-cyan-200 cursor-pointer hover:underline"
              >
                Cambiar contraseña
              </button>
            )}

            {needChange && (
              <>
                <label className="block text-sm text-cyan-100/90">
                  Nueva contraseña
                </label>
                <input
                  type="password"
                  className="w-full rounded border text-cyan-100/90 border-cyan-500/40 bg-black/30 p-2"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
                <label className="block text-sm text-cyan-100/90">
                  Confirmar contraseña
                </label>
                <input
                  type="password"
                  className="w-full rounded border text-cyan-100/90 border-cyan-500/40 bg-black/30 p-2"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                />
              </>
            )}

            {msg ? <p className="text-sm text-amber-300">{msg}</p> : null}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded bg-cyan-500/80 px-3 py-2 font-medium text-black disabled:opacity-60 cursor-pointer"
            >
              {loading
                ? "Procesando..."
                : needChange
                  ? "Guardar nueva contraseña"
                  : "Entrar"}
            </button>

            {needChange && !forceChange && (
              <button
                type="button"
                onClick={() => {
                  setNeedChange(false);
                  setMsg("");
                  setNewPassword("");
                  setConfirm("");
                }}
                className="w-full rounded border border-cyan-500/40 px-3 py-2 text-cyan-100 hover:bg-cyan-500/10 cursor-pointer"
              >
                Volver a iniciar sesión
              </button>
            )}
          </form>
        </div>
      </section>
    </div>
  );
}

