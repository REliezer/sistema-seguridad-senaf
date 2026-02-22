/** Convierte "YYYY-MM-DD" a Date inicio de día */
export function startOfDay(s) {
  if (!s) return null;
  // si viene con hora, respeta
  if (String(s).includes("T")) return new Date(s);
  return new Date(`${s}T00:00:00.000Z`);
}

/** Convierte "YYYY-MM-DD" a Date fin de día */
export function endOfDay(s) {
  if (!s) return null;
  if (String(s).includes("T")) return new Date(s);
  return new Date(`${s}T23:59:59.999Z`);
}

