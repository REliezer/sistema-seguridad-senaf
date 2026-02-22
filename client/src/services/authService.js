const API_BASE = import.meta.env.VITE_API_BASE_URL || "/api";

export async function requestPasswordCode(email) {
  const r = await fetch(`${API_BASE}/iam/v1/auth/password-code/request`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  const data = await r.json().catch(() => ({}));
  return { ok: r.ok, status: r.status, data, error: data?.error };
}

export async function verifyPasswordCode(email, code) {
  const r = await fetch(`${API_BASE}/iam/v1/auth/password-code/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, code }),
  });
  const data = await r.json().catch(() => ({}));
  return { ok: r.ok, status: r.status, data, error: data?.error };
}

export async function login(email, password) {
  const r = await fetch(`${API_BASE}/iam/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await r.json().catch(() => ({}));
  return { ok: r.ok, status: r.status, data, error: data?.error };
}

export async function changePassword(payload) {
  const r = await fetch(`${API_BASE}/iam/v1/auth/change-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await r.json().catch(() => ({}));
  return { ok: r.ok, status: r.status, data, error: data?.error };
}