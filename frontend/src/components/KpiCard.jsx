import React from "react";

export default function KpiCard({ label, value, meta, formatter, highlight = false }) {
  const fmt = (v) => (formatter ? formatter(v) : v);
  const hit = meta != null ? (value / (meta || 1)) >= 1 : null;

  return (
    <div className={`kpi-card ${highlight ? "kpi-highlight" : ""}`}>
      <div className="kpi-label">{label}</div>
      <div className="kpi-value-row">
        <span className="kpi-value">{fmt(value)}</span>
        {meta != null && <span className={`kpi-chip ${hit ? "ok" : "warn"}`}>meta {fmt(meta)}</span>}
      </div>
    </div>
  );
}
