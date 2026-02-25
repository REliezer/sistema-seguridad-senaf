import { sendEmail, buildUserRegistrationHTML } from "./email.service.js";

export function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function normEmail(e) {
  return String(e || "")
    .trim()
    .toLowerCase();
}

export function normBool(v, def = true) {
  if (v === undefined || v === null) return !!def;
  if (typeof v === "boolean") return v;
  if (typeof v === "string") {
    return ["1", "true", "yes", "on"].includes(v.toLowerCase());
  }
  return !!v;
}

export function toStringArray(v) {
  if (Array.isArray(v)) return v.map((s) => String(s).trim()).filter(Boolean);
  if (typeof v === "string") {
    return v
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

// Detecta si un usuario tiene rol de guardia (convenciones: guardia, guard, rondasqr.guard)
export function isGuardRole(u) {
  const NS = process.env.IAM_ROLES_NAMESPACE || "https://senaf.local/roles";
  const roles = [
    ...(Array.isArray(u?.roles) ? u.roles : []),
    ...(Array.isArray(u?.[NS]) ? u[NS] : []),
  ]
    .map((r) => String(r).toLowerCase().trim())
    .filter(Boolean);

  return (
    roles.includes("guardia") ||
    roles.includes("guard") ||
    roles.includes("rondasqr.guard")
  );
}

export async function sendDataUserRegister({ nombre, email, password, fechaRegistro, roles = [] }) {
  const rolesText = Array.isArray(roles) ? roles.join(", ") : String(roles || "");
  
  const htmlContent = buildUserRegistrationHTML({
    nombre,
    email,
    password,
    fechaRegistro,
    roles: rolesText,
  });

  return await sendEmail({
    to: email,
    subject: "Credenciales de acceso - SENAF",
    html: htmlContent,
  });
}
