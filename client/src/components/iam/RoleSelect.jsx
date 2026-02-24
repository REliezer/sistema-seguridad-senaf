import React, { useMemo, useState } from "react";

export default function RoleSelect({ value = [], onChange, availableRoles = [] }) {
  const [open, setOpen] = useState(false);

  const selected = new Set(Array.isArray(value) ? value : []);
  const normalizedRoles = useMemo(
    () =>
      (availableRoles || [])
        .map((r) => ({
          code: r.code || r.key || r.name || r._id,
          label: r.name || r.label || r.code || r.key || r._id,
        }))
        .filter((r) => !!r.code),
    [availableRoles],
  );

  const toggle = (code) => {
    const copy = new Set(selected);
    if (copy.has(code)) copy.delete(code);
    else copy.add(code);
    onChange(Array.from(copy));
  };

  const labelSelected =
    normalizedRoles
      .filter((r) => selected.has(r.code))
      .map((r) => r.label)
      .join(", ") || "Seleccionar rol(es)";

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full px-3 py-2 rounded-lg border border-cyan-500/40 bg-slate-950/60 text-left text-sm shadow-inner flex items-center gap-2"
      >
        <span>{labelSelected}</span>
        <span className="ml-auto text-xs opacity-70">▾</span>
      </button>
      {open && (
        <div className="absolute z-10 mt-1 w-full max-h-60 overflow-auto rounded-xl border border-cyan-500/40 bg-slate-950/95 shadow-[0_0_25px_rgba(34,211,238,0.35)]">
          {normalizedRoles.length === 0 && (
            <div className="px-3 py-2 text-sm text-neutral-500">
              No hay roles configurados.
            </div>
          )}
          {normalizedRoles.map((r) => (
            <label
              key={r.code}
              className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-cyan-500/10 cursor-pointer"
            >
              <input
                type="checkbox"
                className="scale-110 accent-cyan-500"
                checked={selected.has(r.code)}
                onChange={() => toggle(r.code)}
              />
              <span>{r.label}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}