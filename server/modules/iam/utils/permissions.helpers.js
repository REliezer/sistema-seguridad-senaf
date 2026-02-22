/** Normaliza un permiso recibido desde el front */
export function normalizePerm(p = {}) {
  let key = String(p.key ?? "").trim().toLowerCase();
  const label = String(p.label ?? "").trim();
  const group = String(p.group ?? "").trim().toLowerCase();
  const order = Number.isFinite(p.order) ? Number(p.order) : 0;

  //Si viene "create" y group="rondas" => "rondas.create"
  if (group && key && !key.includes(".")) {
    key = `${group}.${key}`;
  }

  return { key, label, group, order };
}

export function validatePerm(p) {
  const errors = [];
  if (!p.key) errors.push("key es requerido");
  if (!p.label) errors.push("label es requerido");
  if (!p.group) errors.push("group es requerido");

  if (p.key && !/^[a-z0-9_.-]+$/i.test(p.key)) {
    errors.push("key solo puede contener letras, números, . _ -");
  }
  if (p.order != null && !Number.isInteger(p.order)) {
    errors.push("order debe ser entero");
  }

  return errors;
}

/** Sanitiza objetos para updates (whitelist) */
export function pickUpdatable(body = {}) {
  const out = {};
  if (body.key != null) out.key = String(body.key).trim().toLowerCase();
  if (body.label != null) out.label = String(body.label).trim();
  if (body.group != null) out.group = String(body.group).trim().toLowerCase();
  if (body.order != null) out.order = Number(body.order) || 0;

  if (out.group && out.key && !out.key.includes(".")) {
    out.key = `${out.group}.${out.key}`;
  }

  return out;
}
