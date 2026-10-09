import React from "react";
import { pontoEm, fita, linha, faixaDoTerco, fitaFusiforme } from "../utils/curvas";

// Desenho de UMA artéria sobre uma curva (utils/curvas.js), com todos os
// achados do laudo arterial: cor pelo fluxo, oclusão no terço, ateromatose,
// estenose, stent, aneurisma (fusiforme/sacular, trombo mural), dissecção e
// letra da onda. Usado pelos mapas do braço e da aorta.

export const COR_ART = {
  normal: "#c0392b",
  hipercinetico: "#7b241c",
  hipocinetico: "#e57373",
  ocluida: "#2b2f33",
  trombo: "#b9c0c7",
};

const ESTILO_PLACA = {
  "Lipídica": { fill: "#ffffff", stroke: "#ffffff" },
  "Calcificada": { fill: "#9aa5b1", stroke: "#6b7684" },
  "Mista": { fill: "#ffffff", stroke: "#6b7684" },
};
const LETRA_ONDA = { "Bifásico": "B", "Monofásico": "M", "Amortecido (tardus-parvus)": "A" };

export function corArteria(v) {
  if (v.velocidade === "Hipercinético") return COR_ART.hipercinetico;
  if (v.velocidade === "Hipocinético") return COR_ART.hipocinetico;
  return COR_ART.normal;
}

const tangente = (p) => [p.ny, -p.nx];

function pontosAteromatose(c, grau) {
  const cfg = grau === "Severa" ? { passo: 6, toward: 0.42, op: 0.85 }
    : grau === "Moderada" ? { passo: 9, toward: 0.3, op: 0.7 }
    : grau === "Discreta" ? { passo: 14, toward: 0.15, op: 0.55 }
    : null;
  if (!cfg) return [];
  const pts = [];
  for (let s = cfg.passo / 2; s < c.comprimento; s += cfg.passo) {
    const p = pontoEm(c, s / c.comprimento);
    const off = p.hw * 0.92 * (1 - cfg.toward);
    pts.push([p.x + p.nx * off, p.y + p.ny * off, cfg.op], [p.x - p.nx * off, p.y - p.ny * off, cfg.op]);
  }
  return pts;
}

// Triângulos de estenose: base na parede, ápices se aproximando pelo grau.
function triangulosEstenose(c, v) {
  const [ta, tb] = faixaDoTerco(v.localizacaoPlaca || "Terço médio");
  const p = pontoEm(c, (ta + tb) / 2);
  const pct = parseFloat(v.estenosePercentual);
  const toward = !(pct >= 50) ? 0.15 : pct <= 70 ? 0.48 : 0.78;
  const base = p.hw * 0.92, apex = p.hw * 0.92 * (1 - toward);
  const span = Math.max(p.hw * 1.6, 4);
  const [tx, ty] = tangente(p);
  return [1, -1].map((sgn) => {
    const bx = p.x + p.nx * base * sgn, by = p.y + p.ny * base * sgn;
    return `M ${bx - tx * span},${by - ty * span} L ${p.x + p.nx * apex * sgn},${p.y + p.ny * apex * sgn} L ${bx + tx * span},${by + ty * span} Z`;
  });
}

// Quanto maior o diâmetro informado, mais largo o aneurisma (limitado).
function fatorAneurisma(v) {
  const d = parseFloat(String(v.aneurismaDiametro || "").replace(",", "."));
  if (!(d > 0)) return 2.2;
  return Math.min(3.2, Math.max(1.6, 1.4 + d / 40));
}

export function PadroesStent({ prefixo }) {
  return (
    <defs>
      {[["pervio", "#2b2f33"], ["reestenose", "#d99a3d"], ["ocluido", "#ffffff"]].map(([id, cor]) => (
        <pattern key={id} id={`${prefixo}-stent-${id}`} width="3" height="3" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="3" stroke={cor} strokeWidth="0.8" />
          <line x1="0" y1="0" x2="3" y2="0" stroke={cor} strokeWidth="0.8" />
        </pattern>
      ))}
    </defs>
  );
}

// c: curva; maxHalf: meia-largura máxima (para o halo de seleção);
// mirrored: o desenho está espelhado (as letras precisam ser "desespelhadas").
export function ArteriaCurva({ nome, c, maxHalf, v, ativo, mirrored, prefixo, onSelecionar }) {
  const ocluida = v.status === "Ocluída";
  const cor = ocluida ? COR_ART.normal : corArteria(v);
  const badge = pontoEm(c, 0.72);
  const sacular = v.aneurismaForma === "Sacular";
  const k = fatorAneurisma(v);
  return (
    <g>
      {ativo && <path d={linha(c)} fill="none" stroke="#0eb8d0" strokeOpacity={0.55} strokeWidth={maxHalf * 2 + 6} strokeLinecap="round" />}
      {v.aneurisma && !sacular && (
        <path d={fitaFusiforme(c, 0.25, 0.75, k)} fill={v.tromboMural ? COR_ART.trombo : cor} stroke="#7b241c" strokeWidth={0.8} />
      )}
      {v.aneurisma && sacular && (() => {
        const p = pontoEm(c, 0.5);
        const r = p.hw * (k - 0.4);
        return <circle cx={p.x + p.nx * (p.hw + r * 0.75)} cy={p.y + p.ny * (p.hw + r * 0.75)} r={r} fill={v.tromboMural ? COR_ART.trombo : cor} stroke="#7b241c" strokeWidth={0.8} />;
      })()}
      <path d={fita(c)} fill={cor} />
      {ocluida && (() => { const [ta, tb] = faixaDoTerco(v.localizacaoOclusao); return <path d={fita(c, ta, tb)} fill={COR_ART.ocluida} />; })()}
      {v.stent && v.stent !== "Ausente" && (
        <>
          {v.stent === "Ocluído" && <path d={fita(c, 0.3, 0.7)} fill={COR_ART.ocluida} />}
          <path d={fita(c, 0.3, 0.7)} fill={`url(#${prefixo}-stent-${v.stent === "Pérvio" ? "pervio" : v.stent === "Ocluído" ? "ocluido" : "reestenose"})`} stroke="#2b2f33" strokeWidth={0.4} />
        </>
      )}
      {v.disseccao && <path d={linha(c, 0.3, 0.7, 0.6)} fill="none" stroke="#ffffff" strokeWidth={0.9} />}
      {pontosAteromatose(c, v.ateromatose).map(([x, y, op], i) => <circle key={i} cx={x} cy={y} r={0.9} fill="#ffffff" opacity={op} />)}
      {!ocluida && v.placa === "Presente" && triangulosEstenose(c, v).map((d, i) => {
        const st = ESTILO_PLACA[v.caracteristicaPlaca] || { fill: "#ffffff", stroke: "#9aa5b1" };
        return <path key={i} d={d} fill={st.fill} stroke={st.stroke} strokeWidth={0.8} />;
      })}
      {!ocluida && LETRA_ONDA[v.tipoOnda] && (
        <g>
          <circle cx={badge.x} cy={badge.y} r={5.2} fill="#ffffff" stroke="#2b2f33" strokeWidth={0.8} />
          <text x={badge.x} y={badge.y + 2.6} fontFamily="monospace" fontSize="7" fontWeight="bold" fill="#2b2f33" textAnchor="middle"
            transform={mirrored ? `translate(${2 * badge.x},0) scale(-1,1)` : undefined}>{LETRA_ONDA[v.tipoOnda]}</text>
        </g>
      )}
      {onSelecionar && <path d={linha(c)} fill="none" stroke="#000" strokeOpacity={0.001} strokeWidth={Math.max(14, maxHalf * 2 + 4)} strokeLinecap="round" style={{ cursor: "pointer" }} onClick={() => onSelecionar(nome)} />}
    </g>
  );
}
