
export default function RoleBadges({ roles = [], roleLabelMap = {} }) {
  const labels = Array.isArray(roles)
    ? roles.map((code) => roleLabelMap[code] || code)
    : [];
  return (
    <div className="flex flex-wrap gap-1">
      {labels.length === 0 ? (
        <span className="text-neutral-500">—</span>
      ) : (
        labels.map((r, i) => (
          <span
            key={`${r}-${i}`}
            className="text-xs px-2 py-1 rounded-full border border-cyan-400/40 bg-cyan-500/5 text-cyan-100"
          >
            {r}
          </span>
        ))
      )}
    </div>
  );
}