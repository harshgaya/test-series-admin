"use client";

export default function StatCard({ label, value, total, color, icon, sub }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-gray-500">{label}</p>
        <span style={{ color }}>{icon}</span>
      </div>
      <p className="text-2xl font-extrabold" style={{ color }}>
        {value.toLocaleString()}
      </p>
      <div className="mt-2 h-1.5 rounded-full bg-gray-100 overflow-hidden">
        <div
          className="h-1.5 rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <p className="text-[11px] text-gray-400 mt-1">
        {sub || `${pct}% of validated`}
      </p>
    </div>
  );
}
