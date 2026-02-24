
/* ===================== Helpers básicos ===================== */

export function getPath(obj, path) {
  return path.split(".").reduce((o, k) => (o == null ? undefined : o[k]), obj);
}

export function getVal(obj, paths, fallback = "") {
  for (const p of paths) {
    const v = p.includes(".") ? getPath(obj, p) : obj?.[p];
    if (v !== undefined && v !== null && v !== "") return v;
  }
  return fallback;
}

export function toDateInputSafe(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

/** Parse "YYYY-MM-DD" a Date (sin problema de zona horaria) */
export function parseDateYMD(value) {
  if (!value || typeof value !== "string") return null;
  const parts = value.split("-");
  if (parts.length !== 3) return null;
  const [y, m, d] = parts.map((n) => parseInt(n, 10));
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

/** Formatea Date -> "YYYY-MM-DD" */
export function formatDateYMD(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Normaliza el objeto de backend a las claves del form */
export function mapUserToFormSafe(api = {}) {
  const nombreFromParts =
    [
      getVal(api, ["persona.nombres"], ""),
      getVal(api, ["persona.apellidos"], ""),
    ]
      .join(" ")
      .trim() || undefined;

  const fechaRaw = getVal(api, [
    "fechaNacimiento",
    "fecha_nacimiento",
    "birthDate",
    "persona.fechaNacimiento",
    "persona.fecha_nacimiento",
    "persona.fnac",
    "datosNacimiento.fecha",
    "nacimiento.fecha",
  ]);

  let roles = getVal(api, ["roles", "persona.roles"], []);
  if (typeof roles === "string") roles = [roles];
  if (Array.isArray(roles)) {
    roles = roles
      .map((r) =>
        typeof r === "string"
          ? r
          : r?.code || r?.name || r?.nombre || r?.key || "",
      )
      .filter(Boolean);
  } else {
    roles = [];
  }

  const active =
    getVal(api, ["active", "persona.active"], undefined) ??
    (getVal(api, ["estado"], "") === "activo"
      ? true
      : getVal(api, ["estado"], "") === "inactivo"
        ? false
        : true);

  const civil = getVal(
    api,
    ["estadoCivil", "estado_civil", "civilStatus", "persona.estadoCivil"],
    "",
  );
  const civilOk = ESTADOS_CIVILES.includes(civil) ? civil : "";

  return {
    // PERSONALES
    nombreCompleto: getVal(
      api,
      ["nombreCompleto", "fullName", "name", "persona.nombreCompleto"],
      nombreFromParts || "",
    ),
    tipoDni: getVal(api, ["tipoDni", "persona.tipoDni"], "Identidad"),
    dni: getVal(
      api,
      [
        "dni",
        "documento",
        "num_documento",
        "numeroDocumento",
        "persona.dni",
        "persona.numeroDocumento",
      ],
      "",
    ),
    estadoCivil: civilOk,
    fechaNacimiento: toDateInputSafe(fechaRaw),
    paisNacimiento: getVal(
      api,
      [
        "paisNacimiento",
        "pais_nacimiento",
        "countryOfBirth",
        "persona.pais",
        "datosNacimiento.pais",
        "nacimiento.pais",
      ],
      "",
    ),
    ciudadNacimiento: getVal(
      api,
      [
        "ciudadNacimiento",
        "ciudad_nacimiento",
        "cityOfBirth",
        "persona.ciudad",
        "datosNacimiento.ciudad",
        "nacimiento.ciudad",
      ],
      "",
    ),
    municipioNacimiento: getVal(
      api,
      [
        "municipioNacimiento",
        "municipio",
        "persona.municipio",
        "datosNacimiento.municipio",
        "nacimiento.municipio",
        "ubicacion.municipio",
      ],
      "",
    ),
    correoPersona: getVal(
      api,
      [
        "correoPersona",
        "email",
        "correo",
        "mail",
        "persona.correo",
        "persona.email",
      ],
      "",
    ),
    profesion: getVal(api, ["profesion", "ocupacion", "persona.ocupacion"], ""),
    lugarTrabajo: getVal(
      api,
      [
        "lugarTrabajo",
        "dondeLabora",
        "empresa",
        "persona.lugar_trabajo",
        "persona.dondeLabora",
      ],
      "",
    ),
    telefono: getVal(
      api,
      [
        "telefono",
        "phone",
        "celular",
        "tel",
        "telefono1",
        "telefono2",
        "persona.telefono",
        "persona.celular",
        "contacto.telefono",
      ],
      "",
    ),
    domicilio: getVal(
      api,
      [
        "domicilio",
        "direccion",
        "address",
        "direccionResidencia",
        "persona.direccion",
        "persona.domicilio",
        "ubicacion.direccion",
      ],
      "",
    ),
    // IAM
    roles,
    active,
    id_persona: getVal(api, ["id_persona", "persona.id_persona"], null),
    _id: getVal(api, ["_id", "id", "persona._id"], undefined),
  };
}