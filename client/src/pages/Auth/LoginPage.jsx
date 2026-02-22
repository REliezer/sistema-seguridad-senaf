import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuthService } from "../../hooks/useAuthService";
import {
  formatMmSs,
  parseCodeState,
  humanFetchError,
} from "../../utils/utils.js";

export default function LoginPage({ forceChange = false }) {
  const {
    loading: svcLoading,
    codeState: svcCodeState,
    requestPasswordCode: svcRequestPasswordCode,
    verifyPasswordCode: svcVerifyPasswordCode,
    login: svcLogin,
    changePassword: svcChangePassword,
  } = useAuthService();

  // Local UI state
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [needChange, setNeedChange] = React.useState(!!forceChange);
  const [msg, setMsg] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  const [codeModalOpen, setCodeModalOpen] = React.useState(false);
  const [verificationCode, setVerificationCode] = React.useState("");
  const [codeMsg, setCodeMsg] = React.useState("");
  const [codeBusy, setCodeBusy] = React.useState(false);
  const [codeVerified, setCodeVerified] = React.useState(false);

  // Code state mirrored from the service hook
  const [expiresAt, setExpiresAt] = React.useState(null);
  const [lockedUntil, setLockedUntil] = React.useState(null);
  const [attemptsRemaining, setAttemptsRemaining] = React.useState(3);
  const [timeLeftSec, setTimeLeftSec] = React.useState(0);

  React.useEffect(() => {
    if (forceChange) setNeedChange(true);
  }, [forceChange]);

  // Mirror svcCodeState into local state to ease UI compatibility
  React.useEffect(() => {
    const parsed = parseCodeState(svcCodeState || {});
    setExpiresAt(parsed.expiresAt);
    setAttemptsRemaining(parsed.attemptsRemaining);
    setLockedUntil(parsed.lockedUntil);
  }, [svcCodeState]);

  React.useEffect(() => {
    if (!expiresAt) {
      setTimeLeftSec(0);
      return;
    }

    const tick = () => {
      const leftMs = new Date(expiresAt).getTime() - Date.now();
      setTimeLeftSec(Math.max(0, Math.ceil(leftMs / 1000)));
    };

    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [expiresAt]);

  React.useEffect(() => {
    // Si cambia el correo, invalida verificacion previa.
    setCodeVerified(false);
  }, [email]);

  const isExpired = !!expiresAt && timeLeftSec <= 0;
  const isLocked =
    !!lockedUntil && new Date(lockedUntil).getTime() > Date.now();

  async function requestPasswordCode({ openModal = true } = {}) {
    setMsg("");
    if (!email) {
      toast.info("Ingresa tu correo para recibir el código.");
      return false;
    }

    setCodeBusy(true);
    setCodeMsg("");
    try {
      const res = await svcRequestPasswordCode(email, openModal);
      if (!res?.ok) {
        return false;
      }
      setCodeVerified(false);
      setVerificationCode("");
      if (openModal) setCodeModalOpen(true);
      return true;
    } catch (err) {
      toast.error(humanFetchError(err, "Error al enviar codigo"));
      return false;
    } finally {
      setCodeBusy(false);
    }
  }

  async function verifyCode() {
    if (!email) {
      setCodeMsg("Correo requerido.");
      toast.info("Correo requerido.");
      return;
    }

    if (!/^\d{6}$/.test(verificationCode)) {
      setCodeMsg("Ingresa un codigo de 6 digitos.");
      return;
    }

    setCodeBusy(true);
    setCodeMsg("");
    try {
      const res = await svcVerifyPasswordCode(email, verificationCode);
      if (!res?.ok) {
        return false;
      }

      setCodeVerified(true);
      setCodeModalOpen(false);
      setMsg("Codigo verificado. Ahora guarda la nueva contraseña.");
      return true;
    } catch (err) {
      setCodeVerified(false);
      toast.error(humanFetchError(err, "No se pudo validar el codigo"));
      return false;
    } finally {
      setCodeBusy(false);
    }
  }

  async function doLogin(e) {
    e?.preventDefault();
    setMsg("");
    setLoading(true);
    try {
      const res = await svcLogin(email, password);

      if (!res?.ok) {
        // If server requires password change, surface it
        if (res?.res?.data?.code === "PASSWORD_CHANGE_REQUIRED" || res?.res?.data?.requirePasswordChange) {
          setNeedChange(true);
          setMsg("Debes cambiar la contraseña para continuar.");
          await requestPasswordCode({ openModal: true });
          return;
        }
        throw new Error(res?.error || "Credenciales invalidas.");
      }
      const token = res?.res?.data?.token || res?.res?.data?.token;
      if (!token) throw new Error("No se recibio token de sesión");
      
    } catch (err) {
      toast.error(err?.message || "Error de autenticación");
    } finally {
      setLoading(false);
    }
  }

  async function doChangePassword(e) {
    e?.preventDefault();
    setMsg("");

    if (forceChange && !password) {
      toast.info("Debes ingresar la contraseña actual.");
      return;
    }

    if (!codeVerified) {
      toast.info("Debes validar el código de verificación.");
      if (!expiresAt || isExpired) {
        const ok = await requestPasswordCode({ openModal: true });
        if (!ok) return;
      }
      setCodeModalOpen(true);
      return;
    }

    if (!newPassword || newPassword !== confirm) {
      toast.warning("La nueva contraseña y la confirmación deben coincidir.");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        email,
        ...(forceChange ? { currentPassword: password } : {}),
        newPassword,
      };

      const res = await svcChangePassword(payload);
      if (!res?.ok) {
        return;
      }
    } catch (err) {
      setMsg(err?.message || "Error al cambiar contraseña");
      toast.error(err?.message || "Error al cambiar contraseña");
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

            <label className="block text-sm text-cyan-100/90">
              Correo electronico
            </label>
            <input
              type="email"
              className="w-full rounded border text-cyan-100/90 border-cyan-500/40 bg-black/30 p-2"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            {!needChange && (
              <>
                <label className="block text-sm text-cyan-100/90">
                  Contraseña
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
                onClick={async () => {
                  setNeedChange(true);
                  setMsg("");
                  if (email) {
                    await requestPasswordCode({ openModal: true });
                  } else {
                    setMsg("Ingresa tu correo para enviar el codigo.");
                  }
                }}
                className="text-sm text-cyan-300 font-light hover:text-cyan-200 cursor-pointer hover:underline"
              >
                Olvide mi contraseña
              </button>
            )}

            {needChange && (
              <>
                <div className="rounded border border-cyan-500/30 bg-black/25 p-3 text-sm text-cyan-100/90">
                  <p>Codigo verificado: {codeVerified ? "SI" : "NO"}</p>
                  <button
                    type="button"
                    onClick={() => requestPasswordCode({ openModal: true })}
                    disabled={codeBusy || !email}
                    className={`mt-2 rounded border border-cyan-500/40 px-2 py-1 text-cyan-200 disabled:opacity-50 ${codeBusy ? "cursor-not-allowed" : "cursor-pointer"}`}
                  >
                    {codeBusy ? "Enviando..." : "Enviar/Reenviar codigo"}
                  </button>
                </div>
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
              disabled={loading || (needChange && !codeVerified)}
              className={`w-full rounded bg-cyan-500/80 px-3 py-2 font-medium text-black disabled:opacity-60 ${needChange && !codeVerified ? "cursor-not-allowed" : "cursor-pointer"}`}
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
                  setCodeVerified(false);
                  setVerificationCode("");
                  setCodeMsg("");
                  setExpiresAt(null);
                  setLockedUntil(null);
                  setAttemptsRemaining(3);
                }}
                className="w-full rounded border border-cyan-500/40 px-3 py-2 text-cyan-100 hover:bg-cyan-500/10 cursor-pointer"
              >
                Volver a iniciar sesion
              </button>
            )}
          </form>
        </div>
      </section>

      {codeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-xl border border-cyan-500/40 bg-neutral-950 p-4 space-y-3">
            <h2 className="text-lg font-semibold text-cyan-100">
              Validar codigo
            </h2>
            <p className="text-sm text-cyan-100/80">
              Ingresa el codigo de 6 digitos enviado a tu correo.
            </p>
            <p className="text-sm text-cyan-200">
              Tiempo restante: {formatMmSs(timeLeftSec)}
            </p>
            <p className="text-sm text-cyan-200">
              Intentos restantes: {attemptsRemaining}
            </p>

            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={verificationCode}
              disabled={isLocked || isExpired}
              onChange={(e) =>
                setVerificationCode(e.target.value.replace(/\D/g, ""))
              }
              className="w-full rounded border border-cyan-500/40 bg-black/30 p-2 text-cyan-100 tracking-[0.3em] text-center"
              placeholder="000000"
            />

            {codeMsg ? (
              <p className="text-sm text-amber-300">{codeMsg}</p>
            ) : null}
            {isLocked ? (
              <p className="text-sm text-amber-300">
                Bloqueado por intentos agotados.
              </p>
            ) : null}
            {isExpired ? (
              <p className="text-sm text-amber-300">Codigo expirado.</p>
            ) : null}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={verifyCode}
                disabled={codeBusy || isLocked || isExpired}
                className="flex-1 rounded bg-cyan-500/80 px-3 py-2 font-medium text-black disabled:opacity-50"
              >
                {codeBusy ? "Validando..." : "Validar codigo"}
              </button>
              <button
                type="button"
                onClick={() => setCodeModalOpen(false)}
                className="rounded border border-cyan-500/40 px-3 py-2 text-cyan-100"
              >
                Cerrar
              </button>
            </div>

            {(isExpired || isLocked) && (
              <button
                type="button"
                onClick={() => requestPasswordCode({ openModal: true })}
                disabled={codeBusy}
                className="text-sm text-cyan-300 hover:text-cyan-200 hover:underline"
              >
                Solicitar nuevo codigo
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
