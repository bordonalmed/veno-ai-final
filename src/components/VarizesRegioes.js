import React from "react";
import { varizesTipoOptions, varizesRegioes, varizesRegiaoLabel } from "../utils/mmiiVenosoLaudo";

// Cada região (coxa/perna/tornozelo/pé) guarda seu próprio tipo de variz,
// independente das outras — assim dá pra ter, por exemplo, "Varizes
// Reticulares" na coxa e "Microvarizes" no tornozelo ao mesmo tempo.
export default function VarizesRegioes({ valores, onChange }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "clamp(4px, 1vw, 6px)" }}>
      {varizesRegioes.map((regiao) => (
        <div key={regiao} style={{ display: "flex", alignItems: "center", gap: "clamp(6px, 1.5vw, 8px)", flexWrap: "wrap" }}>
          <label style={{ minWidth: "clamp(70px, 14vw, 90px)", fontSize: "clamp(11px, 2.2vw, 13px)" }}>
            {varizesRegiaoLabel[regiao]}:
          </label>
          <select
            value={valores?.[regiao] || ""}
            onChange={(e) => onChange({ ...valores, [regiao]: e.target.value })}
            style={{
              minWidth: "clamp(140px, 28vw, 180px)",
              padding: "clamp(3px, 1vw, 4px)",
              borderRadius: "clamp(3px, 1vw, 4px)",
              fontSize: "clamp(11px, 2.2vw, 13px)",
            }}
          >
            <option value="">Nenhuma</option>
            {varizesTipoOptions.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
          </select>
        </div>
      ))}
    </div>
  );
}
