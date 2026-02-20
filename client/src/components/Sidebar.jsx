import React from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  Home,
  DoorOpen,
  Footprints,
  AlertTriangle,
  UsersRound,
  NotebookPen,
  ClipboardList,
  ClipboardCheck,
  ShieldCheck,
  LogOut,
} from "lucide-react";
import { useAuth0 } from "@auth0/auth0-react";
import { iamApi } from "../iam/api/iamApi.js";

const NAV_ITEMS = [
  { to: "/", label: "Panel principal", Icon: Home, emphasizeDark: true, public: true },

  { to: "/accesos", label: "Control de Acceso", Icon: DoorOpen, anyOf: ["accesos.read", "accesos.write", "accesos.export", "*"] },
  {
    to: "/rondasqr/scan",
    label: "Rondas de Vigilancia",
    Icon: Footprints,
    anyOf: ["guardia", "rondasqr.view", "rondasqr.scan.qr", "rondasqr.scan.manual", "*"],
  },
  {
    to: "/incidentes",
    label: "Gestion de Incidentes",
    Icon: AlertTriangle,
    anyOf: ["incidentes.read", "incidentes.create", "incidentes.edit", "incidentes.reports", "*"],
  },
  { to: "/visitas", label: "Control de Visitas", Icon: UsersRound, anyOf: ["visitas.read", "visitas.write", "visitas.close", "*"] },
  { to: "/bitacora", label: "Bitacora Digital", Icon: NotebookPen, anyOf: ["bitacora.read", "bitacora.write", "bitacora.export", "*"] },
  { to: "/supervision", label: "Supervision", Icon: ClipboardList, anyOf: ["supervision.read", "supervision.create", "supervision.edit", "supervision.reports", "*"] },
  { to: "/evaluacion", label: "Evaluacion", Icon: ClipboardCheck, anyOf: ["evaluacion.list", "evaluacion.create", "evaluacion.edit", "evaluacion.reports", "evaluacion.kpi", "*"] },
  {
    to: "/iam/admin",
    label: "Usuarios y Permisos",
    Icon: ShieldCheck,
    anyOf: ["iam.users.manage", "iam.roles.manage", "iam.usuarios.gestionar", "iam.roles.gestionar", "*"],
  },
];

function isPathActive(currentPath, to) {
  if (to === "/") return currentPath === "/";
  return currentPath === to || currentPath.startsWith(to + "/");
}

function NavItem({ to, label, Icon, onClick, emphasizeDark = false }) {
  const { pathname } = useLocation();
  const active = isPathActive(pathname, to);

  const base =
    "group relative block rounded-2xl transition-colors " +
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--ring]";

  const inactive = "hover:bg-white/40 dark:hover:bg-white/10";
  const activeCls =
    "bg-white/55 dark:bg-white/12 ring-1 ring-neutral-200/70 dark:ring-white/10";

  const emphasizeCls = emphasizeDark ? "dark:bg-white/10 dark:ring-white/12" : "";

  return (
    <NavLink
      to={to}
      onClick={(e) => onClick?.(e)}
      className={[base, active ? activeCls : inactive, emphasizeCls].filter(Boolean).join(" ")}
      aria-current={active ? "page" : undefined}
    >
      <div className="flex items-center gap-3 px-4 py-3">
        <Icon className="w-6 h-6 shrink-0 text-neutral-800 dark:text-white" strokeWidth={2} />
        <span className="text-[16px] leading-none text-neutral-900 dark:text-white">
          {label}
        </span>
      </div>
    </NavLink>
  );
}

export default function Sidebar({ onNavigate }) {
  const { isAuthenticated, logout, user, getAccessTokenSilently } = useAuth0();

  const [iamState, setIamState] = React.useState({
    loading: true,
    roles: [],
    perms: [],
  });

  React.useEffect(() => {
    const IS_LOCALHOST =
      typeof window !== "undefined" &&
      (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");

    const SKIP_IAM =
      String(import.meta.env.VITE_SKIP_VERIFY || "") === "1" ||
      String(import.meta.env.VITE_DISABLE_AUTH || "") === "1" ||
      String(import.meta.env.VITE_FORCE_DEV_IAM || "") === "1";

    if (SKIP_IAM) {
      setIamState({ loading: false, roles: ["admin"], perms: ["*"] });
      return;
    }

    let cancel = false;
    (async () => {
      try {
        if (!isAuthenticated) {
          if (!cancel) setIamState({ loading: false, roles: [], perms: [] });
          return;
        }

        const token = await getAccessTokenSilently({
          authorizationParams: {
            audience: import.meta.env.VITE_AUTH0_AUDIENCE,
          },
        });

        const me = await iamApi.me(token);
        const roles = Array.isArray(me?.roles) ? me.roles : [];
        const perms = Array.isArray(me?.permissions)
          ? me.permissions
          : Array.isArray(me?.perms)
            ? me.perms
            : [];

        const superEmail = String(import.meta.env.VITE_SUPERADMIN_EMAIL || "").toLowerCase();
        const email = String(user?.email || me?.email || "").toLowerCase();
        const isSuperadmin = !!superEmail && email === superEmail;

        const finalRoles = isSuperadmin ? [...new Set([...roles, "admin"])] : roles;
        const finalPerms = isSuperadmin ? [...new Set([...perms, "*"])] : perms;

        if (!cancel) setIamState({ loading: false, roles: finalRoles, perms: finalPerms });
      } catch {
        if (!cancel) setIamState({ loading: false, roles: [], perms: [] });
      }
    })();

    return () => {
      cancel = true;
    };
  }, [isAuthenticated, getAccessTokenSilently, user?.email]);

  const visibleItems = React.useMemo(() => {
    const roleSet = new Set((iamState.roles || []).map((r) => String(r).toLowerCase()));
    const permSet = new Set((iamState.perms || []).map((p) => String(p)));
    const permSetLow = new Set((iamState.perms || []).map((p) => String(p).toLowerCase()));

    const hasWildcard = permSet.has("*") || permSetLow.has("*") || roleSet.has("admin");

    const hasToken = (k) => {
      if (!k) return false;
      if (hasWildcard) return true;
      const raw = String(k);
      const low = raw.toLowerCase();
      return permSet.has(raw) || permSetLow.has(low) || roleSet.has(low);
    };

    return NAV_ITEMS.filter((item) => {
      if (item.public) return true;
      const anyOf = Array.isArray(item.anyOf) ? item.anyOf : ["*"];
      return anyOf.some(hasToken);
    });
  }, [iamState.perms, iamState.roles]);

  const handleLogoutClick = () => {
    onNavigate?.();
    try {
      const returnTo = `${window.location.origin}/login`;
      logout({ logoutParams: { returnTo, federated: true } });
    } catch (err) {
      console.error("Error al cerrar sesion:", err);
    }
  };

  return (
    <div
      className={[
        "w-full h-full flex flex-col overflow-y-auto overscroll-contain p-4",
        "bg-white/55 dark:bg-neutral-950/45 backdrop-blur-2xl",
        "border-r border-neutral-200/60 dark:border-white/10",
      ].join(" ")}
      aria-label="Barra lateral"
    >
      <div className="text-2xl font-extrabold mb-6 tracking-tight">SENAF</div>

      <nav className="flex flex-col gap-1 text-[15px]">
        {!iamState.loading && visibleItems.map(({ to, label, Icon, emphasizeDark }) => (
          <NavItem
            key={to}
            to={to}
            label={label}
            Icon={Icon}
            onClick={onNavigate}
            emphasizeDark={emphasizeDark}
          />
        ))}
      </nav>

      <div className="mt-auto pt-6">
        <div className="border-t border-white/10 mb-3" />

        {isAuthenticated && (
          <button
            type="button"
            onClick={handleLogoutClick}
            title="Cerrar sesion"
            className={[
              "group w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-left transition",
              "border border-neutral-200/60 dark:border-white/10",
              "bg-white/55 dark:bg-neutral-950/35 backdrop-blur-xl shadow-sm",
              "hover:bg-white/70 dark:hover:bg-neutral-900/45",
            ].join(" ")}
          >
            <LogOut className="w-5 h-5 text-neutral-900 dark:text-white" strokeWidth={2.5} />
            <span className="font-medium">Salir</span>
          </button>
        )}
      </div>
    </div>
  );
}
