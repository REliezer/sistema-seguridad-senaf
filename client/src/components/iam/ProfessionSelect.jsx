import React, { useRef, useState } from "react";
import { professions as PROFESIONES_OFICIOS } from "../../data/professions";

export default function ProfessionSelect({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const selected = value || "";
  const listRef = useRef(null);

  const handleSelect = (val) => {
    onChange(val);
    setTimeout(() => setOpen(false), 0);
  };

  const scrollList = (direction) => {
    if (!listRef.current) return;
    const delta = direction === "up" ? -120 : 120;
    listRef.current.scrollBy({ top: delta, behavior: "smooth" });
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full px-3 py-2 rounded-lg border border-cyan-500/40 bg-slate-950/60 text-sm flex items-center gap-2 shadow-inner"
      >
        <span className={selected ? "text-neutral-100" : "text-neutral-400"}>
          {selected || "Seleccionar profesión u oficio"}
        </span>
        <span className="ml-auto text-xs opacity-70">▾</span>
      </button>

      {open && (
        <div className="absolute z-30 mt-1 w-full rounded-xl border border-cyan-500/50 bg-slate-950/95 shadow-[0_0_25px_rgba(34,211,238,0.45)] flex">
          <div ref={listRef} className="flex-1 max-h-56 overflow-y-auto">
            {PROFESIONES_OFICIOS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => handleSelect(p)}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-cyan-500/15 ${
                  selected === p
                    ? "bg-cyan-500/20 text-cyan-100"
                    : "text-neutral-100"
                }`}
              >
                {p}
              </button>
            ))}
          </div>

          <div className="flex flex-col border-l border-cyan-500/40">
            <button
              type="button"
              onClick={() => scrollList("up")}
              className="flex-1 px-2 py-2 text-xs text-neutral-100 hover:bg-cyan-500/20"
              title="Subir"
            >
              ▲
            </button>
            <button
              type="button"
              onClick={() => scrollList("down")}
              className="flex-1 px-2 py-2 text-xs text-neutral-100 hover:bg-cyan-500/20 border-t border-cyan-500/40"
              title="Bajar"
            >
              ▼
            </button>
          </div>
        </div>
      )}
    </div>
  );
}