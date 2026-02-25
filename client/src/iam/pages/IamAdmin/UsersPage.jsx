// client/src/iam/pages/IamAdmin/UsersPage.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useAuth0 } from "../../../auth/local-auth-react.jsx";
import { iamApi } from "../../api/iamApi.js";
import { Edit3, Trash2 } from "lucide-react";
import { mapUserToFormSafe } from "../../../utils/userValidation.js";
import { maritalStatuses as ESTADOS_CIVILES } from "../../../data/maritalStatuses.js";
import RoleBadges from "../../../components/iam/RoleBadges.jsx";
import RoleSelect from "../../../components/iam/RoleSelect.jsx";
import CountrySelect from "../../../components/iam/CountrySelect.jsx";
import ProfessionSelect from "../../../components/iam/ProfessionSelect.jsx";
import BirthDatePicker from "../../../components/iam/BirthDatePicker.jsx";
import { toast } from "sonner";

// mismo flag que en iamApi.js, pero del lado del cliente
const DISABLE_AUTH = import.meta.env.VITE_DISABLE_AUTH === "1";

export default function UsersPage() {
  const { isAuthenticated, getAccessTokenSilently } = useAuth0();

  const [items, setItems] = useState([]);
  const [roleCatalog, setRoleCatalog] = useState([]);
  const [q, setQ] = useState("");
  const [onlyActive, setOnlyActive] = useState(true);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [errors, setErrors] = useState({});

  const STEP = 10;
  const [visibleCount, setVisibleCount] = useState(STEP);

  const empty = {
    nombreCompleto: "",
    tipoDni: "Identidad",
    dni: "",
    estadoCivil: "",
    fechaNacimiento: "",
    paisNacimiento: "",
    ciudadNacimiento: "",
    municipioNacimiento: "",
    correoPersona: "",
    profesion: "",
    lugarTrabajo: "",
    telefono: "",
    domicilio: "",
    roles: [],
    active: true,
  };
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState(null);

  const firstFieldRef = useRef(null);
  const tokenRef = useRef(null);
  const [submitting, setSubmitting] = useState(false);

  const roleLabelMap = useMemo(
    () =>
      Object.fromEntries(
        (roleCatalog || []).map((r) => [
          r.code || r.key || r.name || r._id,
          r.name || r.label || r.code || r.key || "(sin nombre)",
        ]),
      ),
    [roleCatalog],
  );

  // 👉 helper centralizado para obtener el token
  const getToken = async () => {
    // si desactivas auth en .env, no se pide token y se usan x-user-*
    if (DISABLE_AUTH) return null;
    if (!isAuthenticated) return null;
    if (tokenRef.current) return tokenRef.current;

    try {
      const t = await getAccessTokenSilently();
      tokenRef.current = t;
      return t || null;
    } catch (e) {
      console.warn("[UsersPage] no se pudo obtener token:", e?.message || e);
      return null;
    }
  };

  async function load() {
    try {
      setLoading(true);
      setErr("");

      const token = await getToken();

      if (!DISABLE_AUTH && !token) {
        setErr(
          "No se pudo obtener token de sesión. Inicia sesión de nuevo para gestionar usuarios.",
        );
        setItems([]);
        setRoleCatalog([]);
        return;
      }

      const [resUsers, resRoles] = await Promise.all([
        iamApi.listUsers("", token),
        iamApi.listRoles ? iamApi.listRoles(token) : Promise.resolve({}),
      ]);

      const users = Array.isArray(resUsers.items) ? [...resUsers.items] : [];
      users.sort((a, b) => {
        const aDate = new Date(a?.createdAt || a?.updatedAt || 0).getTime();
        const bDate = new Date(b?.createdAt || b?.updatedAt || 0).getTime();
        return bDate - aDate;
      });
      setItems(users);

      const rolesRaw = resRoles?.items || resRoles?.roles || [];
      setRoleCatalog(Array.isArray(rolesRaw) ? rolesRaw : []);
    } catch (e) {
      const st = Number(e?.status || e?.response?.status || 0);
      if (st === 401) {
        setErr("Sesión vencida o inválida. Inicia sesión nuevamente.");
      } else if (st === 403) {
        setErr(
          "No tienes permisos para listar el catálogo de roles en producción.",
        );
      } else if (st >= 500) {
        setErr(
          "Error del servidor al cargar roles/usuarios. Intenta de nuevo en unos minutos.",
        );
      } else {
        setErr(e?.message || "Error al cargar usuarios");
      }
      if (st === 401 || st === 403 || st >= 500) {
        setRoleCatalog([]);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // En modo dev (DISABLE_AUTH=1) siempre cargamos; en prod solo si está autenticado
    if (!DISABLE_AUTH && !isAuthenticated) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  const filteredAll = useMemo(() => {
    const t = q.trim().toLowerCase();
    let res = items;
    if (t) {
      res = res.filter(
        (u) =>
          (u.nombreCompleto || u.name || "").toLowerCase().includes(t) ||
          (u.correoPersona || u.email || "").toLowerCase().includes(t) ||
          (u.dni || "").toLowerCase().includes(t) ||
          String(u.id_persona || "")
            .toLowerCase()
            .includes(t),
      );
    }
    if (onlyActive) res = res.filter((u) => u.active !== false);
    return res;
  }, [items, q, onlyActive]);

  function setField(name, value) {
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function validate() {
    const v = {};
    if (!form.nombreCompleto.trim()) v.nombreCompleto = "Requerido";
    if (!form.dni.trim()) v.dni = "Requerido";
    if (!form.correoPersona.trim()) v.correoPersona = "Requerido";
    else if (!/^\S+@\S+\.\S+$/.test(form.correoPersona))
      v.correoPersona = "Correo inválido";

    if (form.fechaNacimiento) {
      const today = new Date().toISOString().split("T")[0];
      if (form.fechaNacimiento === today) {
        v.fechaNacimiento = "La fecha de nacimiento no puede ser hoy";
      }
    }

    if (!Array.isArray(form.roles) || form.roles.length === 0) {
      v.roles = "Seleccione al menos un rol";
    }

    return v;
  }

  async function sendDataUserEmail(userId, email) {
    if (!/^\S+@\S+\.\S+$/.test(email || ""))
      throw new Error("Correo inválido para verificación");

    const token = await getToken();
    if (!DISABLE_AUTH && !token) {
      throw new Error("No hay token para enviar verificación");
    }

    if (typeof iamApi.sendVerificationEmail === "function") {
      return await iamApi.sendVerificationEmail(userId, email, token);
    } else if (typeof iamApi.sendVerification === "function") {
      return await iamApi.sendVerification({ userId, email, token });
    } else {
      throw new Error("La API de verificación no está implementada en iamApi");
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const v = validate();
    setErrors(v);
    const keys = Object.keys(v);
    if (keys.length) {
      const firstKey = keys[0];
      const el = document.querySelector(`[name="${firstKey}"]`);
      if (el?.focus) el.focus();

      // Construir mensaje detallado de errores por campo
      const humanize = (k) => {
        const map = {
          nombreCompleto: "Nombre completo",
          dni: "Número",
          correoPersona: "Correo",
          roles: "Roles",
        };
        if (map[k]) return map[k];
        return String(k)
          .replace(/([A-Z])/g, " $1")
          .replace(/^./, (s) => s.toUpperCase());
      };

      const messages = keys.map((k) => `${humanize(k)}: ${v[k]}`).join("\n");
      toast.info("Corrija los siguientes errores:\n" + messages);
      return;
    }

    try {
      setSubmitting(true);

      const token = await getToken();
      if (!DISABLE_AUTH && !token) {
        toast.warning(
          "No se pudo obtener token de sesión. Inicia sesión nuevamente para guardar.",
        );
        return;
      }

      const payload = { ...form };

      let res;
      let savedId = editing;
      let emailSent = true;

      if (editing) {
        res = await iamApi.updateUser(editing, payload, token);
        savedId =
          res?._id ||
          res?.id ||
          res?.userId ||
          res?.data?._id ||
          res?.data?.item?._id ||
          savedId;
        toast.success("Usuario actualizado correctamente");
      } else {
        res = await iamApi.createUser(payload, token);
        savedId =
          res?._id ||
          res?.id ||
          res?.userId ||
          res?.data?._id ||
          res?.data?.item?._id;
        emailSent = !!(res?.emailSent ?? res?.data?.emailSent);
        if (emailSent) {
          toast.success("Usuario creado y correo enviado.");
        } else {
          toast.warning("Usuario creado, pero no se pudo enviar el correo.");
        }
      }

      if (savedId && form.correoPersona && emailSent) {
        try {
          await sendDataUserEmail(savedId, form.correoPersona);
          toast.success("Se envió el correo de verificación a " + form.correoPersona);
        } catch (ev) {
          console.warn("[UsersPage] verificación no enviada:", ev);
          toast.error(
            "No se pudo enviar la verificación: " +
              (ev?.message || "revisa el backend"),
          );
        }
      }

      if (editing || emailSent) {
        setForm(empty);
        setEditing(null);
        setErrors({});
      }
      await load();
    } catch (e2) {
      toast.error(e2?.message);
      console.error("[UsersPage] submit error:", e2);
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleActive(u) {
    try {
      const token = await getToken();

      if (!DISABLE_AUTH && !token) {
        toast.warning(
          "No se pudo obtener token de sesión. Inicia sesión nuevamente para cambiar estado.",
        );
        return;
      }

      if (u.active === false) await iamApi.enableUser(u._id, token);
      else await iamApi.disableUser(u._id, token);

      await load();
    } catch (e) {
      toast.warning(e?.message || "No se pudo cambiar el estado");
    }
  }

  async function startEdit(u) {
    console.log("[UsersPage] entrar a edición:", u);
    setEditing(u._id);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });

    setLoading(true);
    let full = u;

    try {
      if (typeof iamApi.getUser === "function") {
        const token = await getToken();
        const r = await iamApi.getUser(u._id, token);
        full = r?.item || r?.user || r || u;
      } else if (typeof iamApi.getUserById === "function") {
        const token = await getToken();
        const res = await iamApi.getUserById(u._id, token);
        full =
          res?.data?.item?.usuario ??
          res?.data?.item?.user ??
          res?.data?.item ??
          res?.data?.usuario ??
          res?.data?.user ??
          res?.data ??
          res?.usuario ??
          res?.user ??
          res ??
          u;
      }
    } catch (e) {
      console.warn(
        "[UsersPage] no se pudo obtener detalle; usando item de lista:",
        e,
      );
    } finally {
      setLoading(false);
    }

    try {
      const mapped = mapUserToFormSafe(full);
      
      setForm((prev) => ({
        ...prev,
        ...mapped,
      }));
    } catch {
      setForm((prev) => ({
        ...prev,
        ...mapUserToFormSafe(u),
      }));
    }

    setTimeout(() => firstFieldRef.current?.focus?.(), 120);
  }

  function cancelEdit() {
    setEditing(null);
    setForm(empty);
    setErrors({});
    setTimeout(() => firstFieldRef.current?.focus?.(), 300);
  }

  async function handleDelete(u) {
    const ok = window.confirm(
      `¿Seguro que deseas eliminar al usuario "${
        u.nombreCompleto || u.name || ""
      }"?`,
    );
    if (!ok) return;

    try {
      const token = await getToken();

      if (!DISABLE_AUTH && !token) {
        toast.warning(
          "No se pudo obtener token de sesión. Inicia sesión nuevamente para eliminar.",
        );
        return;
      }

      if (typeof iamApi.deleteUser === "function") {
        await iamApi.deleteUser(u._id, token);
      } else {
        throw new Error("La API no soporta eliminar usuarios aún");
      }

      if (editing === u._id) cancelEdit();
      await load();
      toast.success("Usuario eliminado correctamente.");
    } catch (e) {
      toast.error(e?.message || "No se pudo eliminar el usuario");
    }
  }

  const visibleList = filteredAll.slice(0, visibleCount);

  return (
    <div className="min-h-screen bg-linear-to-br from-[#020617] via-[#020617] to-black text-white p-6 md:p-8 space-y-8">
      <header className="max-w-5xl mx-auto">
        <h1 className="text-2xl md:text-3xl font-semibold mb-2">
          Administración de Usuarios (IAM)
        </h1>
        <p className="text-sm text-neutral-400 max-w-2xl">
          Crea, edita y administra los usuarios del sistema SENAF, incluyendo
          sus datos personales y roles de acceso.
        </p>
      </header>

      {/* Formulario principal */}
      <section className="max-w-5xl mx-auto bg-slate-900/60 border border-cyan-500/30 rounded-2xl shadow-[0_0_30px_rgba(34,211,238,0.25)] p-5 md:p-7 space-y-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h2 className="text-lg md:text-xl font-semibold">
            {editing ? "Editar usuario" : "Registrar nuevo usuario"}
          </h2>
          <button
            type="button"
            onClick={() => {
              setEditing(null);
              setForm(empty);
              setErrors({});
            }}
            className="text-xs md:text-sm px-3 py-1.5 rounded-lg border border-cyan-500/60 hover:bg-cyan-500/10 transition-colors"
          >
            Limpiar formulario
          </button>
        </div>

        {err && (
          <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
            {err}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Datos personales */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm text-neutral-200">
                Nombre completo
              </label>
              <input
                ref={firstFieldRef}
                name="nombreCompleto"
                value={form.nombreCompleto}
                onChange={(e) => setField("nombreCompleto", e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-950/60 border border-cyan-500/30 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/60"
                placeholder="Ej. Juan Pérez"
              />
              {errors.nombreCompleto && (
                <p className="text-xs text-red-400">{errors.nombreCompleto}</p>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-sm text-neutral-200">
                Tipo de documento
              </label>
              <select
                name="tipoDni"
                value={form.tipoDni}
                onChange={(e) => setField("tipoDni", e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-950/60 border border-cyan-500/30 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/60"
              >
                <option>Identidad</option>
                <option>Pasaporte</option>
                <option>RTN</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-sm text-neutral-200">Número</label>
              <input
                name="dni"
                value={form.dni}
                onChange={(e) => setField("dni", e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-950/60 border border-cyan-500/30 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/60"
                placeholder="0000-0000-00000"
              />
              {errors.dni && (
                <p className="text-xs text-red-400">{errors.dni}</p>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-sm text-neutral-200">Estado civil</label>
              <select
                name="estadoCivil"
                value={form.estadoCivil}
                onChange={(e) => setField("estadoCivil", e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-950/60 border border-cyan-500/30 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/60"
              >
                <option value="">Seleccione…</option>
                {ESTADOS_CIVILES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Fecha / país / ciudad / municipio */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <BirthDatePicker
              label="Fecha de nacimiento"
              name="fechaNacimiento"
              value={form.fechaNacimiento}
              onChange={setField}
            />
            <CountrySelect
              label="País de nacimiento"
              name="paisNacimiento"
              value={form.paisNacimiento}
              onChange={setField}
            />
            <div className="space-y-1">
              <label className="text-sm text-neutral-200">
                Ciudad de nacimiento
              </label>
              <input
                name="ciudadNacimiento"
                value={form.ciudadNacimiento}
                onChange={(e) => setField("ciudadNacimiento", e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-950/60 border border-cyan-500/30 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/60"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm text-neutral-200">
                Municipio de nacimiento
              </label>
              <input
                name="municipioNacimiento"
                value={form.municipioNacimiento}
                onChange={(e) =>
                  setField("municipioNacimiento", e.target.value)
                }
                className="w-full px-3 py-2 rounded-lg bg-slate-950/60 border border-cyan-500/30 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/60"
              />
            </div>
          </div>

          {/* Contacto y trabajo */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm text-neutral-200">
                Correo electrónico
              </label>
              <input
                name="correoPersona"
                type="email"
                value={form.correoPersona}
                onChange={(e) => setField("correoPersona", e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-950/60 border border-cyan-500/30 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/60"
                placeholder="usuario@dominio.com"
              />
              {errors.correoPersona && (
                <p className="text-xs text-red-400">{errors.correoPersona}</p>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-sm text-neutral-200">
                Teléfono / Celular
              </label>
              <input
                name="telefono"
                value={form.telefono}
                onChange={(e) => setField("telefono", e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-950/60 border border-cyan-500/30 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/60"
                placeholder="+504 9999-9999"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm text-neutral-200">
                Lugar de trabajo
              </label>
              <input
                name="lugarTrabajo"
                value={form.lugarTrabajo}
                onChange={(e) => setField("lugarTrabajo", e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-950/60 border border-cyan-500/30 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/60"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm text-neutral-200">
                Profesión / oficio
              </label>
              <ProfessionSelect
                value={form.profesion}
                onChange={(val) => setField("profesion", val)}
              />
            </div>

            <div className="space-y-1 md:col-span-2">
              <label className="text-sm text-neutral-200">
                Domicilio / Dirección
              </label>
              <input
                name="domicilio"
                value={form.domicilio}
                onChange={(e) => setField("domicilio", e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-950/60 border border-cyan-500/30 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/60"
                placeholder="Barrio, colonia, referencia…"
              />
            </div>
          </div>

          {/* Roles + estado + password */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
            <div className="space-y-1 md:col-span-2">
              <label className="text-sm text-neutral-200">
                Roles en el sistema
              </label>
              <RoleSelect
                value={form.roles}
                onChange={(val) => setField("roles", val)}
                availableRoles={roleCatalog}
              />
              {errors.roles && (
                <p className="text-xs text-red-400">{errors.roles}</p>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-sm text-neutral-200">Estado</label>
              <select
                name="active"
                value={form.active ? "1" : "0"}
                onChange={(e) =>
                  setField("active", e.target.value === "1")
                }
                className="w-full px-3 py-2 rounded-lg bg-slate-950/60 border border-cyan-500/30 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/60"
              >
                <option value="1">Activo</option>
                <option value="0">Inactivo</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={cancelEdit}
              className="px-4 py-2 text-sm rounded-lg border border-neutral-500/50 text-neutral-200 hover:bg-neutral-700/40"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-sm rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold shadow-[0_0_20px_rgba(34,211,238,0.6)] disabled:opacity-60"
            >
              {submitting
                ? "Guardando..."
                : editing
                  ? "Guardar cambios"
                  : "Crear usuario"}
            </button>
          </div>
        </form>
      </section>

      {/* Tabla de usuarios */}
      <section className="max-w-6xl mx-auto space-y-4">
        <div className="flex flex-col md:flex-row gap-3 justify-between items-start">
          <div>
            <h2 className="text-lg font-semibold mb-1">Usuarios registrados</h2>
            <p className="text-xs text-neutral-400">
              {filteredAll.length} usuario(s) encontrados
            </p>
          </div>
          <div className="flex flex-wrap gap-3 items-center">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por nombre, correo o documento..."
              className="px-3 py-1.5 rounded-lg bg-slate-900/70 border border-cyan-500/30 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/60"
            />
            <label className="flex items-center gap-2 text-xs text-neutral-300">
              <input
                type="checkbox"
                checked={onlyActive}
                onChange={(e) => setOnlyActive(e.target.checked)}
              />
              Mostrar solo activos
            </label>
          </div>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-cyan-500/20 bg-slate-950/70 shadow-[0_0_25px_rgba(34,211,238,0.25)]">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-900/80 text-xs uppercase text-neutral-400 border-b border-cyan-500/20">
              <tr>
                <th className="px-4 py-3 text-left">Nombre</th>
                <th className="px-4 py-3 text-left">Documento</th>
                <th className="px-4 py-3 text-left">Correo</th>
                <th className="px-4 py-3 text-left">Roles</th>
                <th className="px-4 py-3 text-center">Estado</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-6 text-center text-neutral-400"
                  >
                    Cargando usuarios…
                  </td>
                </tr>
              ) : visibleList.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-6 text-center text-neutral-400"
                  >
                    No hay usuarios que coincidan con el filtro.
                  </td>
                </tr>
              ) : (
                visibleList.map((u) => (
                  <tr
                    key={u._id}
                    className="border-b border-slate-800/70 hover:bg-slate-900/70"
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-neutral-100">
                        {u.nombreCompleto || u.name || "(Sin nombre)"}
                      </div>
                      <div className="text-[11px] text-neutral-400">
                        ID persona: {u.id_persona || "—"}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-neutral-200">
                      <div className="text-xs">
                        {u.tipoDni || "Documento"}:{" "}
                        <span className="font-mono">{u.dni || "—"}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-neutral-200">
                      {u.correoPersona || u.email || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <RoleBadges roles={u.roles} roleLabelMap={roleLabelMap} />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-full text-[11px] font-semibold ${
                          u.active !== false
                            ? "bg-emerald-500/15 text-emerald-300 border border-emerald-400/50"
                            : "bg-red-500/15 text-red-300 border border-red-400/50"
                        }`}
                      >
                        <span className="w-2 h-2 rounded-full mr-1 bg-current" />
                        {u.active !== false ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => toggleActive(u)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 text-[11px] rounded-md border ${
                          u.active !== false
                            ? "border-yellow-400/60 text-yellow-200 hover:bg-yellow-400/15"
                            : "border-emerald-400/60 text-emerald-200 hover:bg-emerald-400/15"
                        }`}
                      >
                        {u.active !== false ? "Desactivar" : "Activar"}
                      </button>
                      <button
                        type="button"
                        onClick={() => startEdit(u)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] rounded-md border border-cyan-400/70 text-cyan-200 hover:bg-cyan-400/15"
                      >
                        <Edit3 className="w-3 h-3" />
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(u)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] rounded-md border border-rose-500/70 text-rose-200 hover:bg-rose-500/15"
                      >
                        <Trash2 className="w-3 h-3" />
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {visibleCount < filteredAll.length && (
          <div className="flex justify-center pt-2">
            <button
              type="button"
              onClick={() => setVisibleCount((v) => v + STEP)}
              className="px-4 py-2 text-sm rounded-lg border border-cyan-500/40 text-cyan-200 hover:bg-cyan-500/10"
            >
              Ver más usuarios
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
