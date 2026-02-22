import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import * as authService from "../services/authService";
import { useAuth0 } from "../auth/local-auth-react.jsx";

export function useAuthService() {
  const [loading, setLoading] = useState(false);
  const [codeState, setCodeState] = useState({
    expiresAt: null,
    attemptsRemaining: 3,
    lockedUntil: null,
  });
  const nav = useNavigate();
  const { setLocalSession } = useAuth0();

  const requestPasswordCode = useCallback(async (email, openModal = true) => {
    setLoading(true);
    const res = await authService.requestPasswordCode(email);
    setLoading(false);
    if (!res.ok) {
      toast.error(res.error || "Error al enviar codigo");
      return { ok: false, res };
    }
    // sincronizar estado del código
    setCodeState({
      expiresAt: res.data?.expiresAt || null,
      attemptsRemaining: res.data?.attemptsRemaining ?? 3,
      lockedUntil: res.data?.lockedUntil || null,
    });
    toast.info("Codigo enviado al correo.");
    return { ok: true, res };
  }, []);

  const verifyPasswordCode = useCallback(async (email, code) => {
    setLoading(true);
    const res = await authService.verifyPasswordCode(email, code);
    setLoading(false);
    if (!res.ok) {
      toast.error(res.error || "Codigo invalido");
      // Actualizar codeState con intentos/bloqueo si el servidor lo devuelve
      setCodeState((s) => ({
        ...s,
        attemptsRemaining: res.data?.attemptsRemaining ?? s.attemptsRemaining,
        lockedUntil: res.data?.lockedUntil ?? s.lockedUntil,
        expiresAt: res.data?.expiresAt ?? s.expiresAt,
      }));
      return { ok: false, res };
    }
    setCodeState((s) => ({ ...s, expiresAt: res.data?.expiresAt }));
    toast.success("Codigo verificado. Ahora guarda la nueva contraseña.");
    return { ok: true, res };
  }, []);

  const login = useCallback(
    async (email, password) => {
      setLoading(true);
      const res = await authService.login(email, password);
      setLoading(false);
      if (!res.ok) {
        // si el servidor devuelve code: PASSWORD_CHANGE_REQUIRED, manejarlo en el componente
        return { ok: false, res };
      }
      if (res.data?.token) {
        setLocalSession(res.data.token);
        toast.success("Inicio de sesión exitoso.");
        nav("/start", { replace: true });
      }
      return { ok: true, res };
    },
    [setLocalSession, nav],
  );

  const changePassword = useCallback(
    async (payload) => {
      setLoading(true);
      const res = await authService.changePassword(payload);
      setLoading(false);
      if (!res.ok) {
        toast.error(res.error || "Error al cambiar contraseña");
        return { ok: false, res };
      }
      toast.success("Contraseña cambiada exitosamente.");
      if (res.data?.token) {
        setLocalSession(res.data.token);
      }
      nav("/login", { replace: true });
      return { ok: true, res };
    },
    [setLocalSession, nav],
  );

  return {
    loading,
    codeState,
    requestPasswordCode,
    verifyPasswordCode,
    login,
    changePassword,
  };
}
