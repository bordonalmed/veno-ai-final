import React, { useState } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { svgParaImagemDataUrl } from "../utils/svgParaImagem";
import {
  POSTERIOR_SILHOUETTE,
  catmullRom,
  fitaVeiaSimples,
  interpAt,
  ribbonPath,
  sliceSpine,
} from "../utils/vascularMapping";
import { ARTERIAS } from "../utils/mmiiArterialLaudo";
import { CamposArteria, CamposEnxerto } from "./CamposArteria";
import MapaLayout, { PreviewImagemPdf } from "./MapaLayout";

// Árvore arterial de UMA perna, vista anterior. Desenhada nativamente para a
// perna ESQUERDA (mesma convenção do Mapa Interativo venoso): medial = x menor,
// lateral = x maior. A perna direita é o mesmo desenho espelhado.
export const GEOMETRIA_ARTERIAS = {
  "Artéria Femoral Comum": { spine: [[141, 20], [141, 45], [142, 72]], half: [6, 6, 5.8], rotulo: ["AFC", "medial", 38] },
  "Artéria Femoral Profunda": { spine: [[144, 76], [153, 96], [161, 130], [165, 175], [166, 225]], half: [4.6, 4.4, 4, 3.6, 3.2], rotulo: ["AFP", "lateral", 120] },
  "Artéria Femoral Superficial": { spine: [[140, 76], [137, 120], [133, 170], [132, 220], [136, 265], [142, 292]], half: [5.2, 5, 4.8, 4.6, 4.6, 4.6], rotulo: ["AFS", "medial", 180] },
  "Artéria Poplítea": { spine: [[142, 292], [149, 318], [150, 345], [149, 372], [146, 398]], half: [4.6, 4.5, 4.4, 4.2, 4], rotulo: ["Poplítea", "medial", 330] },
  "Artéria Tibial Anterior": { spine: [[151, 364], [160, 382], [164, 425], [162, 475], [158, 525], [156, 558]], half: [3.4, 3.3, 3.2, 3.1, 3, 2.9], rotulo: ["Tibial ant.", "lateral", 450] },
  "Artéria Fibular": { spine: [[146, 400], [152, 440], [153, 485], [150, 525]], half: [3.2, 3.1, 3, 2.8], rotulo: ["Fibular", "lateral", 505] },
  "Artéria Tibial Posterior": { spine: [[146, 400], [139, 440], [137, 485], [139, 530], [141, 556]], half: [3.4, 3.3, 3.2, 3, 2.9], rotulo: ["Tibial post.", "medial", 470] },
};

export const DESENHO_W = 300;
export const DESENHO_H = 660;

export const COR_ARTERIA = {
  normal: "#c0392b",
  hipercinetico: "#7b241c",
  hipocinetico: "#e57373",
  ocluida: "#2b2f33",
};

const ESTILO_PLACA = {
  "Lipídica": { fill: "#ffffff", stroke: "#ffffff" },
  "Calcificada": { fill: "#9aa5b1", stroke: "#6b7684" },
  "Mista": { fill: "#ffffff", stroke: "#6b7684" },
};

const LETRA_ONDA = { "Bifásico": "B", "Monofásico": "M", "Amortecido (tardus-parvus)": "A" };

function corBase(v) {
  if (v.velocidade === "Hipercinético") return COR_ARTERIA.hipercinetico;
  if (v.velocidade === "Hipocinético") return COR_ARTERIA.hipocinetico;
  return COR_ARTERIA.normal;
}

function extremos(spine) {
  return [spine[0][1], spine[spine.length - 1][1]];
}

// Faixa [yA, yB] de um terço do vaso (proximal = de cima).
function faixaDoTerco(spine, terco) {
  const [y0, y1] = extremos(spine);
  const L = (y1 - y0) / 3;
  if (terco === "Terço proximal") return [y0, y0 + L];
  if (terco === "Terço distal") return [y0 + 2 * L, y1];
  if (terco === "Terço médio") return [y0 + L, y0 + 2 * L];
  return [y0, y1];
}

function wallPos(hw, towardCenter) {
  return hw * 0.92 * (1 - towardCenter);
}

function pontosAteromatose(g, grau) {
  const cfg = grau === "Severa" ? { passo: 6, toward: 0.42, r: 0.9, op: 0.85 }
    : grau === "Moderada" ? { passo: 9, toward: 0.3, r: 0.9, op: 0.7 }
    : grau === "Discreta" ? { passo: 14, toward: 0.15, r: 0.9, op: 0.55 }
    : null;
  if (!cfg) return null;
  const [y0, y1] = extremos(g.spine);
  const pts = [];
  for (let y = y0 + cfg.passo / 2; y < y1; y += cfg.passo) {
    const [x, , hw] = interpAt(g.spine, g.half, y);
    const off = wallPos(hw, cfg.toward);
    pts.push([x - off, y], [x + off, y]);
  }
  return { pts, ...cfg };
}

function triangulosEstenose(g, v) {
  const [ya, yb] = faixaDoTerco(g.spine, v.localizacaoPlaca || "Terço médio");
  const y = (ya + yb) / 2;
  const [x, , hw] = interpAt(g.spine, g.half, y);
  const p = parseFloat(v.estenosePercentual);
  const toward = !(p >= 50) ? 0.15 : p <= 70 ? 0.48 : 0.78;
  const base = wallPos(hw, 0);
  const apex = wallPos(hw, toward);
  const span = Math.max(hw * 1.6, 4);
  return [
    `M ${x - base},${y - span} L ${x - apex},${y} L ${x - base},${y + span} Z`,
    `M ${x + base},${y - span} L ${x + apex},${y} L ${x + base},${y + span} Z`,
  ];
}

function trechoCentral(g, frac = 0.4) {
  const [y0, y1] = extremos(g.spine);
  const meio = (y0 + y1) / 2, metade = ((y1 - y0) * frac) / 2;
  return [meio - metade, meio + metade];
}

function hitPath(d, onClick) {
  return (
    <path d={d} fill="none" stroke="#000" strokeOpacity={0.001} strokeWidth={12} strokeLinecap="round" style={{ cursor: "pointer" }} onClick={onClick} />
  );
}

// Desenho de um membro. Com onSelecionar é clicável (Mapa Interativo); sem,
// é estático (usado no PDF) — o mesmo desenho nos dois.
export function DesenhoMMIIArterial({ lado, arterias, onSelecionar, selecionada, width = "100%", height, style }) {
  const interativo = typeof onSelecionar === "function";
  const mirrored = lado === "Direito";
  const mirrorTransform = mirrored ? `translate(${DESENHO_W},0) scale(-1,1)` : undefined;
  const mx = (x) => (mirrored ? DESENHO_W - x : x);
  const sufixo = mirrored ? "d" : "e";
  const a = arterias || {};

  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 ${DESENHO_W} ${DESENHO_H}`} width={width} height={height} style={style}>
      <defs>
        {[["pervio", "#2b2f33"], ["reestenose", "#d99a3d"], ["ocluido", "#ffffff"]].map(([id, cor]) => (
          <pattern key={id} id={`stent-${id}-${sufixo}`} width="3" height="3" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="3" stroke={cor} strokeWidth="0.8" />
            <line x1="0" y1="0" x2="3" y2="0" stroke={cor} strokeWidth="0.8" />
          </pattern>
        ))}
      </defs>
      <g transform={mirrorTransform}>
        <path d={POSTERIOR_SILHOUETTE} fill="#f3d9bb" stroke="#a97a4e" strokeWidth={1.5} />
        {ARTERIAS.map((nome) => {
          const g = GEOMETRIA_ARTERIAS[nome];
          const v = a[nome];
          if (!g || !v) return null;
          const [y0, y1] = extremos(g.spine);
          const ocluida = v.status === "Ocluída";
          const atero = pontosAteromatose(g, v.ateromatose);
          const ativo = selecionada === nome;
          const [sa, sb] = trechoCentral(g);
          const meioY = (y0 + y1) / 2;
          const [mxv, , mhw] = interpAt(g.spine, g.half, meioY);
          const [bx, by] = (() => { const y = y0 + (y1 - y0) * 0.75; const [x] = interpAt(g.spine, g.half, y); return [x, y]; })();
          return (
            <g key={nome}>
              {v.aneurisma && (
                <ellipse cx={mxv} cy={meioY} rx={mhw * 2.2} ry={mhw * 3.4} fill={ocluida ? COR_ARTERIA.ocluida : corBase(v)} stroke="#7b241c" strokeWidth={0.8} />
              )}
              {ativo && (
                <path d={catmullRom(g.spine, false)} fill="none" stroke="#0eb8d0" strokeOpacity={0.55} strokeWidth={Math.max(...g.half) * 2 + 5} strokeLinecap="round" />
              )}
              <path d={ribbonPath(g.spine, g.half)} fill={ocluida ? COR_ARTERIA.normal : corBase(v)} />
              {ocluida && (() => {
                const [ya, yb] = faixaDoTerco(g.spine, v.localizacaoOclusao);
                return <path d={fitaVeiaSimples(g.spine, g.half, ya, yb)} fill={COR_ARTERIA.ocluida} />;
              })()}
              {v.stent && v.stent !== "Ausente" && (
                <>
                  {v.stent === "Ocluído" && <path d={fitaVeiaSimples(g.spine, g.half, sa, sb)} fill={COR_ARTERIA.ocluida} />}
                  <path
                    d={fitaVeiaSimples(g.spine, g.half, sa, sb)}
                    fill={`url(#stent-${v.stent === "Pérvio" ? "pervio" : v.stent === "Ocluído" ? "ocluido" : "reestenose"}-${sufixo})`}
                    stroke="#2b2f33"
                    strokeWidth={0.4}
                  />
                </>
              )}
              {v.disseccao && (
                <path
                  d={catmullRom(sliceSpine(g.spine, g.half, sa, sb).map(([x, y]) => [x + 0.6, y]), false)}
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth={0.9}
                />
              )}
              {atero && atero.pts.map(([x, y], i) => (
                <circle key={i} cx={x} cy={y} r={atero.r} fill="#ffffff" opacity={atero.op} />
              ))}
              {!ocluida && v.placa === "Presente" && triangulosEstenose(g, v).map((d, i) => {
                const st = ESTILO_PLACA[v.caracteristicaPlaca] || { fill: "#ffffff", stroke: "#9aa5b1" };
                return <path key={i} d={d} fill={st.fill} stroke={st.stroke} strokeWidth={0.8} />;
              })}
              {!ocluida && LETRA_ONDA[v.tipoOnda] && (
                <g>
                  <circle cx={bx} cy={by} r={5.2} fill="#ffffff" stroke="#2b2f33" strokeWidth={0.8} />
                  <text x={bx} y={by + 2.6} fontFamily="monospace" fontSize="7" fontWeight="bold" fill="#2b2f33" textAnchor="middle"
                    transform={mirrored ? `translate(${2 * bx},0) scale(-1,1)` : undefined}>{LETRA_ONDA[v.tipoOnda]}</text>
                </g>
              )}
              {interativo && hitPath(catmullRom(g.spine, false), () => onSelecionar(nome))}
            </g>
          );
        })}
      </g>
      {ARTERIAS.map((nome) => {
        const g = GEOMETRIA_ARTERIAS[nome];
        if (!g) return null;
        const [txt, ladoRotulo, y] = g.rotulo;
        const p = g.spine.reduce((acc, b) => (Math.abs(b[1] - y) < Math.abs(acc[1] - y) ? b : acc));
        const medial = ladoRotulo === "medial";
        const xl = medial ? 72 : 228;
        return (
          <g key={nome} style={interativo ? { cursor: "pointer" } : undefined} onClick={interativo ? () => onSelecionar(nome) : undefined}>
            <line x1={mx(p[0])} y1={p[1]} x2={mx(xl + (medial ? 4 : -4))} y2={y} stroke="#9aa5b1" strokeWidth={0.8} />
            <text x={mx(xl)} y={y + 3} fontFamily="monospace" fontSize="10" fontWeight={selecionada === nome ? "bold" : "normal"}
              fill={selecionada === nome ? "#0b8ca0" : "#1a2530"} textAnchor={medial !== mirrored ? "end" : "start"}>{txt}</text>
          </g>
        );
      })}
      <text x={mx(14)} y={14} fontFamily="sans-serif" fontSize="9" fill="#5c6b78" textAnchor={mirrored ? "end" : "start"}>medial</text>
      <text x={mx(286)} y={14} fontFamily="sans-serif" fontSize="9" fill="#5c6b78" textAnchor={mirrored ? "start" : "end"}>lateral</text>
      <text x={DESENHO_W / 2} y={DESENHO_H - 8} fontFamily="monospace" fontSize="13" textAnchor="middle" fill="#5c6b78">Visão anterior</text>
    </svg>
  );
}

function hexParaRgb(hex) {
  const m = hex.replace("#", "");
  return { r: parseInt(m.substring(0, 2), 16), g: parseInt(m.substring(2, 4), 16), b: parseInt(m.substring(4, 6), 16) };
}

// Uma página por membro com o mesmo desenho do Mapa Interativo + legenda.
export async function adicionarMapaArterialAoPdf(doc, lados, arteriasPorLado) {
  const pageWidth = doc.internal.pageSize.getWidth();
  for (const ladoAtual of lados) {
    const svg = renderToStaticMarkup(
      <DesenhoMMIIArterial lado={ladoAtual} arterias={arteriasPorLado[ladoAtual]} width={DESENHO_W} height={DESENHO_H} />
    );
    const dataUrl = await svgParaImagemDataUrl(svg, DESENHO_W, DESENHO_H);
    doc.addPage();
    let y = 16;
    doc.setFontSize(13);
    doc.setFont(undefined, "bold");
    doc.text(`Mapeamento Arterial — Membro Inferior ${ladoAtual}`, pageWidth / 2, y, { align: "center" });
    doc.setFont(undefined, "normal");
    y += 6;
    const alturaMm = 215;
    const larguraMm = alturaMm * (DESENHO_W / DESENHO_H);
    doc.addImage(dataUrl, "JPEG", (pageWidth - larguraMm) / 2, y, larguraMm, alturaMm);
    y += alturaMm + 7;

    doc.setFontSize(8.5);
    const larguraItens = ITENS_LEGENDA_ARTERIAL.reduce((acc, [t]) => acc + 6 + doc.getTextWidth(t) + 8, -8);
    let x = (pageWidth - larguraItens) / 2;
    ITENS_LEGENDA_ARTERIAL.forEach(([t, cor]) => {
      const rgb = hexParaRgb(cor);
      doc.setFillColor(rgb.r, rgb.g, rgb.b);
      doc.rect(x, y - 2.6, 4, 2, "F");
      doc.setTextColor(90, 100, 110);
      doc.text(t, x + 6, y);
      x += 6 + doc.getTextWidth(t) + 8;
    });
    y += 5;
    doc.setFontSize(7.5);
    doc.text("Pontos brancos = ateromatose   ·   triângulos = estenose (branco lipídica, cinza calcificada, contorno cinza mista)", pageWidth / 2, y, { align: "center" });
    y += 4.5;
    doc.text("Malha = stent   ·   B / M / A = onda bifásica / monofásica / amortecida", pageWidth / 2, y, { align: "center" });
    doc.setTextColor(0, 0, 0);
  }
}

// Legenda em HTML (tela). O PDF desenha a mesma legenda com o jsPDF.
export const ITENS_LEGENDA_ARTERIAL = [
  ["Fluxo normal", COR_ARTERIA.normal],
  ["Hipercinético", COR_ARTERIA.hipercinetico],
  ["Hipocinético", COR_ARTERIA.hipocinetico],
  ["Oclusão", COR_ARTERIA.ocluida],
];

function LegendaArterial() {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 10px", justifyContent: "center", fontSize: 11, color: "#5c6b78" }}>
      {ITENS_LEGENDA_ARTERIAL.map(([t, c]) => (
        <span key={t} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
          <span style={{ width: 14, height: 6, background: c, borderRadius: 3, display: "inline-block" }} /> {t}
        </span>
      ))}
      <span>pontos brancos = ateromatose</span>
      <span>triângulos = estenose (branco lipídica, cinza calcificada, contorno cinza mista)</span>
      <span>malha = stent</span>
      <span>B / M / A = onda bifásica / monofásica / amortecida</span>
    </div>
  );
}

// Mapa Interativo do Doppler Arterial de MMII: uma perna por vez. Com o exame
// em "Ambos", preenche o Direito, troca pro Esquerdo e preenche — igual ao venoso.
export default function MapaInterativoArterial({
  aberto, onFechar,
  lado, ladoAtivo, onTrocarLado,
  arterias, onArteriaChange,
  enxertos, onEnxertoChange,
  laudoMembro,
  incluirMapaPdf, onIncluirMapaPdf,
  onSalvarTXT, onSalvarPDF, onSalvarExame,
  embutido,
}) {
  const [selecionada, setSelecionada] = useState(null);
  const [mostrarPreview, setMostrarPreview] = useState(false);
  if (!aberto) return null;
  const l = ladoAtivo;
  const valores = arterias?.[l] || {};
  const lados = lado === "Ambos" ? ["Direito", "Esquerdo"] : [l];

  return (
    <>
      <MapaLayout
      embutido={embutido}
        titulo="MMII Arterial"
        onFechar={onFechar}
        lado={lado}
        ladoAtivo={l}
        onTrocarLado={(op) => { onTrocarLado(op); setSelecionada(null); }}
        desenho={
          <DesenhoMMIIArterial
            lado={l} arterias={valores} onSelecionar={setSelecionada} selecionada={selecionada}
            style={{ display: "block", width: "100%", maxWidth: 380, maxHeight: "72vh" }}
          />
        }
        legenda={<LegendaArterial />}
        painel={selecionada && valores[selecionada] ? (
          <CamposArteria
            arteria={selecionada}
            lado={l}
            valores={valores[selecionada]}
            onChange={(v) => onArteriaChange(l, selecionada, v)}
            semMoldura
          />
        ) : null}
        tituloPainel={selecionada ? `${selecionada} (${l})` : ""}
        onFecharPainel={() => setSelecionada(null)}
        conteudo={
          <>
            <div className="mapa-claro">
              <CamposEnxerto lado={l} enxerto={enxertos?.[l] || { tipo: "", status: "" }} onChange={(e) => onEnxertoChange(l, e)} />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Laudo ({l}) — atualizado em tempo real:</div>
              <pre style={{ background: "#f7f9fa", border: "1px solid #dfe6ec", color: "#222", borderRadius: 8, padding: 10, fontSize: 12, whiteSpace: "pre-wrap", margin: 0, maxHeight: 320, overflowY: "auto" }}>{laudoMembro}</pre>
            </div>
          </>
        }
        incluirPdf={incluirMapaPdf}
        onIncluirPdf={onIncluirMapaPdf}
        onVisualizarImagem={() => setMostrarPreview(true)}
        onSalvarTXT={onSalvarTXT}
        onSalvarPDF={onSalvarPDF}
        onSalvarExame={onSalvarExame}
      />
      {mostrarPreview && (
        <PreviewImagemPdf titulo="Mapeamento Arterial — Membro Inferior" onFechar={() => setMostrarPreview(false)}>
          <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
            {lados.map((ld) => (
              <div key={ld} style={{ flex: "1 1 260px", maxWidth: 380, textAlign: "center" }}>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>Membro Inferior {ld}</div>
                <DesenhoMMIIArterial lado={ld} arterias={arterias?.[ld] || {}} style={{ display: "block", width: "100%" }} />
              </div>
            ))}
          </div>
          <div style={{ marginTop: 8 }}><LegendaArterial /></div>
        </PreviewImagemPdf>
      )}
    </>
  );
}
