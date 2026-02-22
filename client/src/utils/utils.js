export function formatMmSs(totalSec) {
  const sec = Math.max(0, Number(totalSec || 0));
  const m = String(Math.floor(sec / 60)).padStart(2, "0");
  const s = String(sec % 60).padStart(2, "0");
  return `${m}:${s}`;
}

export function parseCodeState(data = {}) {
  return {
    expiresAt: data?.expiresAt ?? null,
    attemptsRemaining:
      typeof data?.attemptsRemaining === "number"
        ? Math.max(0, data.attemptsRemaining)
        : 3,
    lockedUntil: data?.lockedUntil ?? null,
  };
}

export function humanFetchError(err, fallback) {
  const m = String(err?.message || "");
  if (m.toLowerCase().includes("failed to fetch")) {
    return `No se pudo conectar con la API. Revisa VITE_API_BASE_URL y CORS.`;
  }
  return m || fallback;
}