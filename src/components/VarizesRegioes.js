import React from "react";
import { varizesTipoOptions, varizesFaces, varizesSegmentoLabel, normalizarVarizesLado } from "../utils/mmiiVenosoLaudo";

// Varizes por ponto, nas faces anterior e posterior (os mesmos 16 pontos do
// desenho). Cada ponto guarda seu próprio tipo; o laudo cita só os tipos.
export default function VarizesRegioes({ valores, onChange }) {
  const v = normalizarVarizesLado(valores);
  const selectStyle = {
    minWidth: "clamp(130px, 24vw, 170px)",
    padding: "clamp(3px, 1vw, 4px)",
    borderRadius: "clamp(3px, 1vw, 4px)",
    fontSize: "clamp(11px, 2.2vw, 13px)",
  };
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "clamp(12px, 3vw, 28px)" }}>
      {[["anterior", "Face anterior"], ["posterior", "Face posterior"]].map(([face, titulo]) => (
        <div key={face} style={{ display: "flex", flexDirection: "column", gap: "clamp(4px, 1vw, 6px)" }}>
          <div style={{ fontWeight: 700, fontSize: "clamp(11px, 2.2vw, 13px)", color: "#0eb8d0" }}>{titulo}</div>
          {varizesFaces[face].map((regiao) => (
            <div key={regiao} style={{ display: "flex", alignItems: "center", gap: "clamp(6px, 1.5vw, 8px)", flexWrap: "wrap" }}>
              <label style={{ minWidth: "clamp(90px, 16vw, 110px)", fontSize: "clamp(11px, 2.2vw, 13px)" }}>
                {varizesSegmentoLabel[regiao].charAt(0).toUpperCase() + varizesSegmentoLabel[regiao].slice(1)}:
              </label>
              <select value={v[regiao] || ""} onChange={(e) => onChange({ ...v, [regiao]: e.target.value })} style={selectStyle}>
                <option value="">Nenhuma</option>
                {varizesTipoOptions.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
