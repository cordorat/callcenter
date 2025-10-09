import React from "react";

export default function UpdateBadge({ updatedAtISO }) {
  if (!updatedAtISO) return null;
  const d = new Date(updatedAtISO);
  const hh = String(d.getHours()).padStart(2,"0");
  const mm = String(d.getMinutes()).padStart(2,"0");
  const dd = String(d.getDate()).padStart(2,"0");
  const mo = String(d.getMonth()+1).padStart(2,"0");
  const yyyy = d.getFullYear();
  return <span className="update-badge">Última actualización: {dd}/{mo}/{yyyy} {hh}:{mm}</span>;
}
