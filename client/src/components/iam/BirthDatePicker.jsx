import React, { useState } from "react";
import { parseDateYMD, formatDateYMD } from "../../utils/userValidation";

export default function BirthDatePicker({ label, name, value, onChange }) {
  const [open, setOpen] = useState(false);
  const parsed = value ? parseDateYMD(value) || new Date() : new Date();
  const [viewDate, setViewDate] = useState(parsed);

  const selectedDate = value ? parseDateYMD(value) : null;

  const months = [
    "Enero",
    "Febrero",
    "Marzo",
    "Abril",
    "Mayo",
    "Junio",
    "Julio",
    "Agosto",
    "Septiembre",
    "Octubre",
    "Noviembre",
    "Diciembre",
  ];
  const daysShort = ["D", "L", "M", "Mi", "J", "V", "S"];

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1);
  const startWeekday = firstDayOfMonth.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const handleSelectDay = (day) => {
    if (!day) return;
    const d = new Date(year, month, day);
    const ymd = formatDateYMD(d);
    onChange(name, ymd);
    setOpen(false);
  };

  const goMonth = (delta) => {
    setViewDate((prev) => {
      const d = new Date(prev);
      d.setMonth(d.getMonth() + delta);
      return d;
    });
  };

  return (
    <div className="relative">
      <label className="space-y-1 block">
        <span className="text-sm text-neutral-200">{label}</span>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="w-full px-3 py-2 rounded-lg border border-cyan-500/40 bg-slate-950/70 text-sm flex items-center gap-2 shadow-inner"
        >
          <span className={value ? "text-neutral-100" : "text-neutral-400"}>
            {value || "Seleccionar fecha"}
          </span>
          <span className="ml-auto text-xs opacity-70">📅</span>
        </button>
      </label>

      {open && (
        <div className="absolute z-40 mt-1 w-72 rounded-xl border border-cyan-500/60 bg-slate-950/95 backdrop-blur-sm shadow-[0_0_25px_rgba(34,211,238,0.55)] p-3">
          <div className="flex items-center justify-between mb-2 text-sm text-neutral-100">
            <button
              type="button"
              onClick={() => goMonth(-1)}
              className="px-2 py-1 rounded-md border border-cyan-500/40 hover:bg-cyan-500/15 text-xs"
            >
              ◀
            </button>
            <div className="font-medium">
              {months[month]} {year}
            </div>
            <button
              type="button"
              onClick={() => goMonth(1)}
              className="px-2 py-1 rounded-md border border-cyan-500/40 hover:bg-cyan-500/15 text-xs"
            >
              ▶
            </button>
          </div>

          <div className="grid grid-cols-7 text-[11px] text-center text-neutral-300 mb-1">
            {daysShort.map((d) => (
              <div key={d} className="py-1">
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1 text-sm">
            {cells.map((day, idx) => {
              if (!day) return <div key={idx} className="h-8" />;
              const isSelected =
                selectedDate &&
                selectedDate.getFullYear() === year &&
                selectedDate.getMonth() === month &&
                selectedDate.getDate() === day;

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectDay(day)}
                  className={`h-8 w-8 rounded-full flex items-center justify-center text-xs ${
                    isSelected
                      ? "bg-cyan-500 text-slate-950 font-semibold"
                      : "text-neutral-100 hover:bg-cyan-500/20"
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
