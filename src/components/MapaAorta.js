import React, { useState } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { svgParaImagemDataUrl } from "../utils/svgParaImagem";
import { catmullRom } from "../utils/vascularMapping";
import { criarCurva, pontoEm, fita, linha, fitaFusiforme } from "../utils/curvas";
import { ARTERIAS } from "../utils/aortaIliacasLaudo";
import { CamposArteria } from "./CamposArteria";
import { CamposEnxertoAorta, CamposFemoroFemoral } from "./CamposAorta";
import { ArteriaCurva, PadroesStent, COR_ART, COR_ENXERTO, COR_LESAO_ENXERTO } from "./ArteriaCurva";
import MapaLayout, { PreviewImagemPdf } from "./MapaLayout";

// Abdome em vista anterior (do esterno à raiz das coxas). Lado direito do
// paciente à esquerda da tela. A aorta fica um pouco à esquerda da linha média
// do paciente (direita da tela).

// margens dos dois lados para os rótulos ficarem fora do corpo
export const ABD_X0 = -80;
export const ABD_W = 460;
export const ABD_H = 420;

const LADO_DIREITO_SILHUETA = [[46, 0], [44, 40], [48, 90], [56, 140], [58, 175], [52, 215], [40, 255], [32, 295], [32, 335], [38, 375], [44, 420]];
const COXA_INTERNA = [[112, 420], [116, 396], [126, 370], [138, 354], [150, 349], [162, 354], [174, 370], [184, 396], [188, 420]];
const espelho = (pts) => pts.map(([x, y]) => [300 - x, y]);

function juntar(...partes) {
  return partes.map((d, i) => (i === 0 ? d : d.replace(/^M/, "L"))).join(" ") + " Z";
}
export const SILHUETA_ABDOME = juntar(
  catmullRom(LADO_DIREITO_SILHUETA, false),
  catmullRom(COXA_INTERNA, false),
  catmullRom(espelho(LADO_DIREITO_SILHUETA).reverse(), false),
);

// Vasos editáveis: pontos do início (proximal) ao fim (distal).
export const GEOMETRIA_AORTA = {
  "Aorta Suprarrenal": { pts: [[156, 26], [156, 60], [156, 96]], half: [9.5, 9.4, 9.2], rotulo: ["Ao suprarrenal", 282, 62, "start"] },
  "Aorta Justarrenal": { pts: [[156, 96], [156, 112], [156, 128]], half: [9.2, 9.1, 9], rotulo: ["Ao justarrenal", 282, 114, "start"] },
  "Aorta Infrarrenal": { pts: [[156, 128], [156, 170], [155, 212], [154, 236]], half: [9, 8.8, 8.4, 8], rotulo: ["Ao infrarrenal", 282, 182, "start"] },
  "Artéria Ilíaca Comum Direita": { pts: [[151, 236], [138, 262], [124, 288], [116, 304]], half: [5.6, 5.5, 5.3, 5.2], rotulo: ["Ilíaca comum D", 18, 262, "end"] },
  "Artéria Ilíaca Externa Direita": { pts: [[116, 304], [108, 326], [102, 348], [99, 364]], half: [4.8, 4.7, 4.6, 4.5], rotulo: ["Ilíaca externa D", 18, 326, "end"] },
  "Artéria Ilíaca Interna Direita": { pts: [[117, 306], [125, 320], [130, 334], [133, 348]], half: [3.4, 3.3, 3.1, 3], rotulo: ["Ilíaca interna D", 18, 362, "end"] },
  "Artéria Ilíaca Comum Esquerda": { pts: [[157, 236], [170, 262], [184, 288], [192, 304]], half: [5.6, 5.5, 5.3, 5.2], rotulo: ["Ilíaca comum E", 282, 262, "start"] },
  "Artéria Ilíaca Externa Esquerda": { pts: [[192, 304], [200, 326], [206, 348], [209, 364]], half: [4.8, 4.7, 4.6, 4.5], rotulo: ["Ilíaca externa E", 282, 326, "start"] },
  "Artéria Ilíaca Interna Esquerda": { pts: [[191, 306], [183, 320], [178, 334], [175, 348]], half: [3.4, 3.3, 3.1, 3], rotulo: ["Ilíaca interna E", 282, 362, "start"] },
};

const CURVAS = Object.fromEntries(Object.entries(GEOMETRIA_AORTA).map(([n, g]) => [n, criarCurva(g.pts, g.half)]));

// Referências (não editáveis)
const REFERENCIAS = [
  { pts: [[156, 46], [140, 40], [120, 44]], half: 2 }, // a. hepática comum
  { pts: [[156, 46], [176, 40], [200, 46]], half: 2 }, // a. esplênica
  { pts: [[152, 60], [140, 86], [132, 122], [128, 170]], half: 2.6 }, // AMS
  { pts: [[148, 104], [127, 108], [108, 120]], half: 2.8 }, // a. renal direita
  { pts: [[164, 100], [180, 104], [192, 112]], half: 2.8 }, // a. renal esquerda
  { pts: [[99, 364], [97, 392], [96, 420]], half: 4.4 }, // femoral comum D
  { pts: [[209, 364], [211, 392], [212, 420]], half: 4.4 }, // femoral comum E
].map((r) => criarCurva(r.pts, r.half));

const ROTULOS_REF = [["T. celíaco", 282, 32, "start"], ["AMS", 18, 168, "end"], ["Aa. renais", 18, 110, "end"], ["Aa. femorais comuns", 18, 404, "end"]];

const COR_REF = "#e8b4ae";

// Endoprótese: malha sobre os vasos cobertos, por tipo. Começa logo abaixo das
// artérias renais (fim da aorta justarrenal). Cada trecho pertence a uma parte
// (corpo / ramo direito / ramo esquerdo), para marcar onde está a lesão.
const COBERTURA_ENDOPROTESE = {
  "Endoprótese aórtica (EVAR)": [["Aorta Justarrenal", 0.75, 1, "corpo"], ["Aorta Infrarrenal", 0, 1, "corpo"], ["Artéria Ilíaca Comum Direita", 0, 1, "ramoD"], ["Artéria Ilíaca Comum Esquerda", 0, 1, "ramoE"]],
  "Endoprótese aorto-uni-ilíaca direita": [["Aorta Justarrenal", 0.75, 1, "corpo"], ["Aorta Infrarrenal", 0, 1, "corpo"], ["Artéria Ilíaca Comum Direita", 0, 1, "ramoD"], ["Artéria Ilíaca Externa Direita", 0, 0.6, "ramoD"]],
  "Endoprótese aorto-uni-ilíaca esquerda": [["Aorta Justarrenal", 0.75, 1, "corpo"], ["Aorta Infrarrenal", 0, 1, "corpo"], ["Artéria Ilíaca Comum Esquerda", 0, 1, "ramoE"], ["Artéria Ilíaca Externa Esquerda", 0, 0.6, "ramoE"]],
  "Endoprótese ilíaca": [["Artéria Ilíaca Comum Direita", 0.1, 1, "ramoD"], ["Artéria Ilíaca Comum Esquerda", 0.1, 1, "ramoE"]],
};
// Local da lesão -> [parte acometida (ou "todas"), parte e posição da marca].
const LOCAL_ENDOPROTESE = {
  "Corpo principal": ["todas", "corpo", 0.5],
  "Ramo ilíaco direito": ["ramoD", "ramoD", 0.5],
  "Ramo ilíaco esquerdo": ["ramoE", "ramoE", 0.5],
  "Ilíaca direita": ["ramoD", "ramoD", 0.5],
  "Ilíaca esquerda": ["ramoE", "ramoE", 0.5],
};

// Enxerto convencional (prótese): tubo azul sobreposto, da aorta infrarrenal
// (abaixo das renais) até as ilíacas comuns ou até as femorais comuns.
const espelhoIliaca = (pts) => pts.map(([x, y]) => [308 - x, y]);
const CORPO_ENXERTO = [[156, 134], [156, 180], [155, 214], [154, 234]];
const RAMO_BI_ILIACO = [[154, 234], [141, 258], [128, 282], [118, 302]];
const RAMO_BIFEMORAL = [[154, 234], [140, 260], [125, 292], [111, 326], [102, 356], [98, 386]];
const GEOMETRIA_ENXERTO_AORTA = {
  "Enxerto aorto-bi-ilíaco": { corpo: CORPO_ENXERTO, ramoD: RAMO_BI_ILIACO, ramoE: espelhoIliaca(RAMO_BI_ILIACO) },
  "Enxerto aorto-bifemoral": { corpo: CORPO_ENXERTO, ramoD: RAMO_BIFEMORAL, ramoE: espelhoIliaca(RAMO_BIFEMORAL) },
};
const CURVAS_ENXERTO = Object.fromEntries(Object.entries(GEOMETRIA_ENXERTO_AORTA).map(([tipo, partes]) => [
  tipo, Object.fromEntries(Object.entries(partes).map(([parte, pts]) => [parte, criarCurva(pts, 5)])),
]));
const LOCAL_ENXERTO = {
  "Anastomose proximal": ["todas", "corpo", 0.04],
  "Corpo do enxerto": ["todas", "corpo", 0.5],
  "Ramo direito": ["ramoD", "ramoD", 0.5],
  "Ramo esquerdo": ["ramoE", "ramoE", 0.5],
  "Anastomose distal direita": ["ramoD", "ramoD", 0.96],
  "Anastomose distal esquerda": ["ramoE", "ramoE", 0.96],
};

// Situação de cada parte: com local informado só a parte dele fica alterada.
function situacaoDaParte(enx, parte, locais) {
  if (enx.status !== "Com estenose" && enx.status !== "Ocluído") return "Pérvio";
  const loc = locais[enx.local];
  if (!loc || loc[0] === "todas" || loc[0] === parte) return enx.status;
  return "Pérvio";
}

function MarcaLesao({ c, t, status }) {
  const p = pontoEm(c, t);
  return status === "Ocluído"
    ? <circle cx={p.x} cy={p.y} r={4.6} fill={COR_ART.ocluida} stroke="#ffffff" strokeWidth={1} />
    : <circle cx={p.x} cy={p.y} r={6.5} fill="none" stroke={COR_LESAO_ENXERTO} strokeWidth={2.6} />;
}

function DesenhoEnxertoAorta({ enx }) {
  const curvas = CURVAS_ENXERTO[enx.tipo];
  if (!curvas) return null;
  const loc = LOCAL_ENXERTO[enx.local];
  const alterado = enx.status === "Com estenose" || enx.status === "Ocluído";
  // ramos primeiro, corpo por cima (a bifurcação fica limpa)
  return (
    <g style={{ pointerEvents: "none" }}>
      {["ramoD", "ramoE", "corpo"].map((parte) => {
        const c = curvas[parte];
        const ocl = situacaoDaParte(enx, parte, LOCAL_ENXERTO) === "Ocluído";
        return (
          <g key={parte}>
            <path d={linha(c)} fill="none" stroke="#ffffff" strokeWidth={13} strokeLinecap="round" opacity={0.9} />
            <path d={linha(c)} fill="none" stroke={ocl ? COR_ENXERTO.ocluido : COR_ENXERTO.pervio} strokeWidth={9} strokeLinecap="round"
              strokeDasharray={ocl ? "7 4" : undefined} />
          </g>
        );
      })}
      {alterado && loc && <MarcaLesao c={curvas[loc[1]]} t={loc[2]} status={enx.status} />}
    </g>
  );
}

// Fêmoro-femoral cruzado: passa por cima do púbis, de uma femoral comum à outra.
const CURVA_FEMORO_FEMORAL = criarCurva([[99, 394], [106, 362], [126, 330], [154, 320], [182, 330], [202, 362], [209, 394]], 4.2);
const T_LOCAL_FF = { "Anastomose femoral direita": 0.03, "Corpo do enxerto": 0.5, "Anastomose femoral esquerda": 0.97 };

function DesenhoFemoroFemoral({ ff }) {
  if (!ff?.presente) return null;
  const c = CURVA_FEMORO_FEMORAL;
  const ocluido = ff.status === "Ocluído";
  const alterado = ocluido || ff.status === "Com estenose";
  const t = T_LOCAL_FF[ff.local];
  return (
    <g style={{ pointerEvents: "none" }}>
      <path d={linha(c)} fill="none" stroke="#ffffff" strokeWidth={11.5} strokeLinecap="round" opacity={0.9} />
      <path d={linha(c)} fill="none" stroke={ocluido ? COR_ENXERTO.ocluido : COR_ENXERTO.pervio} strokeWidth={8} strokeLinecap="round" strokeDasharray={ocluido ? "7 4" : undefined} />
      {alterado && t !== undefined && <MarcaLesao c={c} t={t} status={ff.status} />}
    </g>
  );
}

function DesenhoEndoprotese({ enx }) {
  const cobertura = COBERTURA_ENDOPROTESE[enx.tipo];
  if (!cobertura) return null;
  const loc = LOCAL_ENDOPROTESE[enx.local];
  const alterado = enx.status === "Com estenose" || enx.status === "Ocluído";
  // marca no trecho mais longo da parte acometida
  const trechoMarca = alterado && loc && cobertura.filter(([, , , parte]) => parte === loc[1])
    .sort((a, b) => (b[2] - b[1]) * CURVAS[b[0]].comprimento - (a[2] - a[1]) * CURVAS[a[0]].comprimento)[0];
  return (
    <g style={{ pointerEvents: "none" }}>
      {cobertura.map(([nome, ta, tb, parte]) => {
        const sit = situacaoDaParte(enx, parte, LOCAL_ENDOPROTESE);
        return (
          <g key={nome}>
            {sit === "Ocluído" && <path d={fita(CURVAS[nome], ta, tb)} fill={COR_ART.ocluida} />}
            <path d={fita(CURVAS[nome], ta, tb, 1.08)} fill={`url(#ao-stent-${sit === "Com estenose" ? "reestenose" : sit === "Ocluído" ? "ocluido" : "pervio"})`}
              stroke="#2b2f33" strokeWidth={0.6} />
          </g>
        );
      })}
      {trechoMarca && <MarcaLesao c={CURVAS[trechoMarca[0]]} t={(trechoMarca[1] + trechoMarca[2]) / 2} status={enx.status} />}
    </g>
  );
}

function Rotulo({ chave, txt, lx, ly, ancora, alvo, ativo, onSelecionar, referencia }) {
  const fonte = referencia ? 8.5 : 10;
  const w = txt.length * fonte * 0.6;
  // a linha sai do vaso e chega na ponta do texto mais próxima dele
  const xa = ancora === "end" ? lx - w : lx;
  const xb = ancora === "end" ? lx : lx + w;
  const xLinha = Math.abs(alvo[0] - xa) < Math.abs(alvo[0] - xb) ? xa - 2 : xb + 2;
  return (
    <g style={onSelecionar ? { cursor: "pointer" } : undefined} onClick={onSelecionar ? () => onSelecionar(chave) : undefined}>
      <line x1={alvo[0]} y1={alvo[1]} x2={xLinha} y2={ly} stroke={referencia ? "#d5c2b0" : "#9aa5b1"} strokeWidth={0.7} />
      <text x={lx} y={ly + 3} fontFamily="monospace" fontSize={fonte} fontStyle={referencia ? "italic" : "normal"} fontWeight={ativo ? "bold" : "normal"}
        fill={referencia ? "#9b8573" : ativo ? "#0b8ca0" : "#1a2530"} textAnchor={ancora}>{txt}</text>
    </g>
  );
}

function alvoRotulo(nome, ly) {
  const c = CURVAS[nome];
  const a = c.amostras.reduce((acc, s) => (Math.abs(s.y - ly) < Math.abs(acc.y - ly) ? s : acc));
  return [a.x, a.y];
}

export function DesenhoAortaIliacas({ arterias, extra, onSelecionar, selecionada, width = "100%", height, style }) {
  const a = arterias || {};
  const enx = extra?.enxerto || {};
  const endo = /^Endoprótese/.test(enx.tipo || "");
  const infra = CURVAS["Aorta Infrarrenal"];
  const temSaco = endo && /^Endoprótese a/.test(enx.tipo) && (parseFloat(enx.sacoDiametro) > 0 || (enx.endoleak && enx.endoleak !== "Ausente"));
  const vazamento = endo && enx.endoleak && enx.endoleak !== "Ausente";
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox={`${ABD_X0} 0 ${ABD_W} ${ABD_H}`} width={width} height={height} style={style}>
      <PadroesStent prefixo="ao" />
      <path d={SILHUETA_ABDOME} fill="#f3d9bb" stroke="#a97a4e" strokeWidth={1.5} />
      {/* rebordos costais, umbigo e ligamentos inguinais: referência anatômica */}
      {[[[150, 26], [122, 46], [92, 78], [66, 118]], espelho([[150, 26], [122, 46], [92, 78], [66, 118]])].map((pts, i) => (
        <path key={i} d={catmullRom(pts, false)} fill="none" stroke="#c9a27a" strokeWidth={1.6} opacity={0.7} />
      ))}
      <ellipse cx={150} cy={206} rx={3.2} ry={4} fill="none" stroke="#b98a5e" strokeWidth={1.2} />
      {[[[64, 284], [96, 312], [130, 338]], espelho([[64, 284], [96, 312], [130, 338]])].map((pts, i) => (
        <path key={i} d={catmullRom(pts, false)} fill="none" stroke="#c9a27a" strokeWidth={1.1} strokeDasharray="4 3" opacity={0.8} />
      ))}
      {/* rins */}
      <ellipse cx={92} cy={130} rx={16} ry={28} transform="rotate(12 92 130)" fill="#ead0b4" stroke="#c9a27a" strokeWidth={1.1} />
      <ellipse cx={208} cy={120} rx={16} ry={28} transform="rotate(-12 208 120)" fill="#ead0b4" stroke="#c9a27a" strokeWidth={1.1} />
      {REFERENCIAS.map((c, i) => <path key={i} d={fita(c)} fill={COR_REF} />)}

      {/* saco aneurismático tratado (endoprótese): cinza = trombosado */}
      {temSaco && (
        <path d={fitaFusiforme(infra, 0.2, 0.95, Math.min(3.2, Math.max(2, 1.4 + (parseFloat(enx.sacoDiametro) || 55) / 40)))} fill={COR_ART.trombo} stroke="#7b241c" strokeWidth={0.8} />
      )}

      {ARTERIAS.map((nome) => {
        const g = GEOMETRIA_AORTA[nome];
        const v = a[nome];
        if (!g || !v) return null;
        return (
          <ArteriaCurva key={nome} nome={nome} c={CURVAS[nome]} maxHalf={Math.max(...g.half)} v={v}
            ativo={selecionada === nome} prefixo="ao" onSelecionar={onSelecionar} />
        );
      })}

      {vazamento && (() => {
        const p = pontoEm(infra, 0.55);
        return [1, -1].map((s) => (
          <circle key={s} style={{ pointerEvents: "none" }} cx={p.x + p.nx * p.hw * 1.8 * s} cy={p.y + p.ny * p.hw * 1.8 * s} r={3.2} fill="#f1c40f" stroke="#b7950b" strokeWidth={0.6} />
        ));
      })()}
      {/* endoprótese: malha sobre os vasos; enxerto: tubo azul sobreposto */}
      {endo ? <DesenhoEndoprotese enx={enx} /> : <DesenhoEnxertoAorta enx={enx} />}
      <DesenhoFemoroFemoral ff={extra?.femoroFemoral} />

      {ROTULOS_REF.map(([txt, lx, ly, ancora], i) => {
        const alvo = [[160, 44], [130, 150], [118, 112], [97, 400]][i];
        return <Rotulo key={txt} chave={txt} txt={txt} lx={lx} ly={ly} ancora={ancora} alvo={alvo} referencia />;
      })}
      {ARTERIAS.map((nome) => {
        const [txt, lx, ly, ancora] = GEOMETRIA_AORTA[nome].rotulo;
        return (
          <Rotulo key={nome} chave={nome} txt={txt} lx={lx} ly={ly} ancora={ancora}
            alvo={/Interna/.test(nome) ? GEOMETRIA_AORTA[nome].pts[GEOMETRIA_AORTA[nome].pts.length - 1] : alvoRotulo(nome, ly)}
            ativo={selecionada === nome} onSelecionar={onSelecionar} />
        );
      })}
      <text x={-74} y={12} fontFamily="sans-serif" fontSize="10" fill="#5c6b78">direita</text>
      <text x={374} y={12} fontFamily="sans-serif" fontSize="10" fill="#5c6b78" textAnchor="end">esquerda</text>
      <text x={374} y={ABD_H - 6} fontFamily="monospace" fontSize="12" textAnchor="end" fill="#5c6b78">Visão anterior</text>
    </svg>
  );
}

// ---------- Legenda ----------
export const ITENS_LEGENDA_AORTA = [
  ["Fluxo normal", COR_ART.normal],
  ["Hipercinético", COR_ART.hipercinetico],
  ["Hipocinético", COR_ART.hipocinetico],
  ["Oclusão", COR_ART.ocluida],
  ["Trombo mural", COR_ART.trombo],
  ["Vazamento (endoleak)", "#f1c40f"],
  ["Enxerto (prótese)", COR_ENXERTO.pervio],
];

export function LegendaAorta() {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 10px", justifyContent: "center", fontSize: 11, color: "#5c6b78" }}>
      {ITENS_LEGENDA_AORTA.map(([t, c]) => (
        <span key={t} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
          <span style={{ width: 14, height: 6, background: c, borderRadius: 3, display: "inline-block" }} /> {t}
        </span>
      ))}
      <span>pontos brancos = ateromatose</span>
      <span>triângulos = estenose</span>
      <span>malha = stent / endoprótese</span>
      <span>enxerto tracejado cinza = ocluído · círculo laranja = estenose do enxerto</span>
      <span>B / M / A = onda bifásica / monofásica / amortecida</span>
    </div>
  );
}

// ---------- PDF ----------
function hexParaRgb(hex) {
  const m = hex.replace("#", "");
  return { r: parseInt(m.substring(0, 2), 16), g: parseInt(m.substring(2, 4), 16), b: parseInt(m.substring(4, 6), 16) };
}

export async function adicionarMapaAortaAoPdf(doc, arterias, extra) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const svg = renderToStaticMarkup(<DesenhoAortaIliacas arterias={arterias} extra={extra} width={ABD_W * 2} height={ABD_H * 2} />);
  const dataUrl = await svgParaImagemDataUrl(svg, ABD_W * 2, ABD_H * 2);
  doc.addPage();
  let y = 16;
  doc.setFontSize(13);
  doc.setFont(undefined, "bold");
  doc.text("Mapeamento — Aorta Abdominal e Artérias Ilíacas", pageWidth / 2, y, { align: "center" });
  doc.setFont(undefined, "normal");
  y += 6;
  const larguraMm = 170;
  const alturaMm = larguraMm * (ABD_H / ABD_W);
  doc.addImage(dataUrl, "JPEG", (pageWidth - larguraMm) / 2, y, larguraMm, alturaMm);
  y += alturaMm + 7;
  doc.setFontSize(8.5);
  const larguraItens = ITENS_LEGENDA_AORTA.reduce((acc, [t]) => acc + 6 + doc.getTextWidth(t) + 8, -8);
  let x = (pageWidth - larguraItens) / 2;
  ITENS_LEGENDA_AORTA.forEach(([t, cor]) => {
    const rgb = hexParaRgb(cor);
    doc.setFillColor(rgb.r, rgb.g, rgb.b);
    doc.rect(x, y - 2.6, 4, 2, "F");
    doc.setTextColor(90, 100, 110);
    doc.text(t, x + 6, y);
    x += 6 + doc.getTextWidth(t) + 8;
  });
  doc.setFontSize(7.5);
  y += 4.5;
  doc.text("Pontos brancos = ateromatose   ·   triângulos = estenose   ·   malha = stent / endoprótese   ·   B / M / A = onda", pageWidth / 2, y, { align: "center" });
  y += 4;
  doc.text("Enxerto azul = pérvio   ·   tracejado cinza = ocluído   ·   círculo laranja = estenose   ·   ponto preto = oclusão", pageWidth / 2, y, { align: "center" });
  doc.setTextColor(0, 0, 0);
}

// ---------- VENO.AI Map ----------
const estiloLaudo = { background: "#f7f9fa", border: "1px solid #dfe6ec", color: "#222", borderRadius: 8, padding: 10, fontSize: 12, whiteSpace: "pre-wrap", margin: 0, maxHeight: 320, overflowY: "auto" };

export function MapaInterativoAorta({
  aberto, onFechar, arterias, onArteriaChange, extra, onExtraChange, observacoes, onObservacoes, laudo,
  incluirMapaPdf, onIncluirMapaPdf, onSalvarTXT, onSalvarPDF, onSalvarExame, embutido,
}) {
  const [selecionada, setSelecionada] = useState(null);
  const [mostrarPreview, setMostrarPreview] = useState(false);
  if (!aberto) return null;
  const valores = arterias || {};
  return (
    <>
      <MapaLayout
        embutido={embutido}
        titulo="Aorta e Ilíacas"
        onFechar={onFechar}
        desenho={<DesenhoAortaIliacas arterias={valores} extra={extra} onSelecionar={setSelecionada} selecionada={selecionada} style={{ display: "block", width: "100%", maxWidth: 520, maxHeight: "72vh" }} />}
        legenda={<LegendaAorta />}
        painel={selecionada && valores[selecionada] ? (
          <CamposArteria arteria={selecionada} lado="" valores={valores[selecionada]} onChange={(v) => onArteriaChange(selecionada, v)} semMoldura comCalibre />
        ) : null}
        tituloPainel={selecionada || ""}
        onFecharPainel={() => setSelecionada(null)}
        conteudo={
          <>
            {extra && (
              <div className="mapa-claro">
                <CamposEnxertoAorta enxerto={extra.enxerto} onChange={(e) => onExtraChange({ ...extra, enxerto: e })} />
                <CamposFemoroFemoral femoroFemoral={extra.femoroFemoral} onChange={(f) => onExtraChange({ ...extra, femoroFemoral: f })} />
              </div>
            )}
            <div>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>Observações:</div>
              <textarea
                value={observacoes || ""}
                onChange={(e) => onObservacoes(e.target.value)}
                placeholder="Observações adicionais..."
                style={{ width: "100%", minHeight: 50, fontSize: 13, borderRadius: 6, border: "1.5px solid #0eb8d0", padding: 8, resize: "vertical", boxSizing: "border-box" }}
              />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Laudo — atualizado em tempo real:</div>
              <pre style={estiloLaudo}>{laudo}</pre>
            </div>
          </>
        }
        incluirPdf={incluirMapaPdf} onIncluirPdf={onIncluirMapaPdf}
        onVisualizarImagem={() => setMostrarPreview(true)}
        onSalvarTXT={onSalvarTXT} onSalvarPDF={onSalvarPDF} onSalvarExame={onSalvarExame}
      />
      {mostrarPreview && (
        <PreviewImagemPdf titulo="Mapeamento — Aorta Abdominal e Artérias Ilíacas" onFechar={() => setMostrarPreview(false)}>
          <div style={{ maxWidth: 620, margin: "0 auto" }}>
            <DesenhoAortaIliacas arterias={valores} extra={extra} style={{ display: "block", width: "100%" }} />
          </div>
          <div style={{ marginTop: 8 }}><LegendaAorta /></div>
        </PreviewImagemPdf>
      )}
    </>
  );
}

// Para os testes: pontos de cada vaso editável.
export function pontosDosVasosAorta() {
  return Object.fromEntries(Object.entries(CURVAS).map(([n, c]) => [n, c.amostras]));
}
