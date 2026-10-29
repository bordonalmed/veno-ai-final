import React from "react";
import { varizesRegioes, normalizarVarizesLado } from "../utils/mmiiVenosoLaudo";
import { VarizLinhaLegenda } from "./MapaInterativo";

// Varizes no formulário escrito: agora são desenhadas no Mapa (botão
// "Desenhar varizes"). Aqui fica só o resumo do que foi desenhado e, para
// exames antigos marcados por região, a opção de remover essas marcações.
const ROTULO = {
  "Varizes Superficiais": "superficiais",
  "Varizes Reticulares": "reticulares",
  "Microvarizes": "microvarizes",
  "Tromboflebite Superficial": "tromboflebite superficial",
};

export default function VarizesRegioes({ valores, onChange, onAbrirMapa }) {
  const v = normalizarVarizesLado(valores);
  const tracos = v.tracos || [];
  const porTipo = Object.keys(ROTULO)
    .map((tipo) => [tipo, tracos.filter((t) => t.tipo === tipo).length])
    .filter(([, n]) => n > 0);
  const regioesMarcadas = varizesRegioes.filter((r) => v[r]);
  const texto = { fontSize: "clamp(11px, 2.2vw, 13px)" };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "clamp(6px, 1.5vw, 8px)" }}>
      {porTipo.length ? (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "clamp(8px, 2vw, 14px)", alignItems: "center", ...texto }}>
          <span>Desenhadas no mapa:</span>
          {porTipo.map(([tipo, n]) => (
            <span key={tipo} style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
              <VarizLinhaLegenda tipo={tipo} /> {ROTULO[tipo]} ({n})
            </span>
          ))}
        </div>
      ) : (
        <div style={{ ...texto, opacity: 0.85 }}>Nenhuma variz desenhada.</div>
      )}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
        {onAbrirMapa && (
          <button
            type="button"
            onClick={onAbrirMapa}
            style={{ padding: "6px 12px", borderRadius: 4, border: "1.5px solid #0eb8d0", background: "transparent", color: "#0eb8d0", fontWeight: 600, fontSize: 12, cursor: "pointer" }}
          >
            ✏️ Desenhar varizes no mapa
          </button>
        )}
        {regioesMarcadas.length > 0 && (
          <button
            type="button"
            onClick={() => {
              const limpo = { ...v };
              regioesMarcadas.forEach((r) => { limpo[r] = ""; });
              onChange(limpo);
            }}
            style={{ padding: "6px 12px", borderRadius: 4, border: "none", background: "#c0392b", color: "#fff", fontSize: 12, cursor: "pointer" }}
            title="Este exame tem varizes marcadas no formato antigo (por região)"
          >
            Remover marcações antigas por região ({regioesMarcadas.length})
          </button>
        )}
      </div>
    </div>
  );
}
