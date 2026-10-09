import React, { useState } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { svgParaImagemDataUrl } from "../utils/svgParaImagem";
import { catmullRom } from "../utils/vascularMapping";
import { criarCurva, fita } from "../utils/curvas";
import { NOMES_VASOS, normalizarVaso, paraDesenhoArterial } from "../utils/carotidasLaudo";
import { ArteriaCurva, PadroesStent, COR_ART } from "./ArteriaCurva";
import CamposCarotida from "./CamposCarotida";
import MapaLayout, { PreviewImagemPdf } from "./MapaLayout";

// Nomes completos dos 8 vasos editáveis (iguais aos usados no formulário e no laudo).
export const CAROTIDAS_VESSEL_NAMES = NOMES_VASOS;

// Pescoço em vista anterior, do arco aórtico à mandíbula. Lado direito do
// paciente à esquerda da tela. Mesmo desenho (curvas + ArteriaCurva) dos mapas
// arteriais de MMSS e aorta: mesmas cores, estenose, stent, dissecção e aneurisma.
export const CAR_X0 = -36;
export const CAR_W = 532;
export const CAR_H = 560;

const espelho = (pts) => pts.map(([x, y]) => [460 - x, y]);

const PESCOCO_D = [[100, 0], [98, 80], [96, 170], [94, 250], [88, 310], [72, 345], [36, 365], [-10, 378], [-36, 384]];
const SILHUETA = catmullRom(PESCOCO_D, false)
  + ` L ${CAR_X0},${CAR_H} L ${CAR_X0 + CAR_W},${CAR_H} `
  + catmullRom(espelho(PESCOCO_D).reverse(), false).replace(/^M/, "L") + " Z";

// Vasos editáveis: do início (proximal) ao fim (distal).
const ACCD = { pts: [[176, 416], [172, 360], [168, 300], [166, 240], [166, 206]], half: [6.5, 6.5, 6.4, 6.6, 7.8] };
const ACID = { pts: [[166, 206], [161, 176], [158, 130], [157, 80], [158, 22]], half: [7.4, 5.8, 5.2, 5, 5] };
const ACED = { pts: [[168, 204], [180, 180], [188, 148], [192, 110], [194, 70]], half: [4.8, 4.2, 3.8, 3.4, 3.2] };
const AVD = { pts: [[124, 403], [120, 370], [118, 320], [116, 260], [116, 180], [118, 100], [122, 30]], half: 3.2 };
const espelharVaso = (g) => ({ pts: espelho(g.pts), half: g.half });

export const GEOMETRIA_CAROTIDAS = {
  ACCD: { ...ACCD, rotulo: ["A. carótida comum", 320] },
  ACID: { ...ACID, rotulo: ["A. carótida interna", 70] },
  ACED: { ...ACED, rotulo: ["A. carótida externa", 130] },
  AVD: { ...AVD, rotulo: ["A. vertebral", 250] },
  // a carótida comum esquerda nasce direto do arco
  ACCE: { pts: [[262, 460], [284, 412], [290, 360], [292, 300], [294, 240], [294, 206]], half: [6.6, 6.5, 6.5, 6.4, 6.6, 7.8], rotulo: ["A. carótida comum", 320] },
  ACIE: { ...espelharVaso(ACID), rotulo: ["A. carótida interna", 70] },
  ACEE: { ...espelharVaso(ACED), rotulo: ["A. carótida externa", 130] },
  AVE: { pts: [[336, 414], [340, 370], [342, 320], [344, 260], [344, 180], [342, 100], [338, 30]], half: 3.2, rotulo: ["A. vertebral", 250] },
};
const ORDEM_DESENHO = ["ACCD", "ACID", "ACED", "AVD", "ACCE", "ACIE", "ACEE", "AVE"];
const DIREITOS = ["ACCD", "ACID", "ACED", "AVD"];

const CURVAS = Object.fromEntries(Object.entries(GEOMETRIA_CAROTIDAS).map(([k, g]) => [k, criarCurva(g.pts, g.half)]));

// Referências (não editáveis): arco, tronco braquiocefálico, subclávias e um
// ramo da carótida externa de cada lado.
const REFERENCIAS = [
  { pts: [[150, 560], [156, 505], [182, 470], [230, 456], [280, 466], [306, 500], [312, 560]], half: 15 },
  { pts: [[198, 470], [186, 440], [176, 416]], half: 7 },
  { pts: [[176, 416], [150, 406], [110, 402], [60, 410], [0, 424], [-36, 432]], half: 5.5 },
  { pts: [[300, 470], [318, 432], [350, 412], [400, 406], [460, 424], [496, 432]], half: 5.5 },
  { pts: [[184, 172], [198, 178], [206, 192]], half: 1.5 },
  { pts: espelho([[184, 172], [198, 178], [206, 192]]), half: 1.5 },
].map((r) => criarCurva(r.pts, r.half));
const COR_REF = "#e8b4ae";

function Rotulo({ chave, txt, lx, ly, ancora, alvo, ativo, onSelecionar, referencia }) {
  const fonte = referencia ? 8.5 : 10;
  const w = txt.length * fonte * 0.6;
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

function alvoRotulo(k, ly) {
  const a = CURVAS[k].amostras.reduce((acc, s) => (Math.abs(s.y - ly) < Math.abs(acc.y - ly) ? s : acc));
  return [a.x, a.y];
}

export function DesenhoCarotidas({ vessels, onSelecionar, selecionada, width = "100%", height, style }) {
  const vasos = vessels || {};
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox={`${CAR_X0} 0 ${CAR_W} ${CAR_H}`} width={width} height={height} style={style}>
      <PadroesStent prefixo="car" />
      <path d={SILHUETA} fill="#f3d9bb" stroke="#a97a4e" strokeWidth={1.5} />
      {/* mandíbula, coluna cervical e clavículas: referência anatômica */}
      <path d={catmullRom([[100, 24], [150, 48], [230, 60], [310, 48], [360, 24]], false)} fill="none" stroke="#c9a27a" strokeWidth={2} opacity={0.7} />
      {Array.from({ length: 12 }, (_, i) => (
        <rect key={i} x={214} y={34 + i * 30} width={32} height={22} rx={5} fill="#ead0b4" stroke="#d5b796" strokeWidth={0.9} />
      ))}
      {[[[204, 438], [150, 424], [90, 418], [30, 426]], espelho([[204, 438], [150, 424], [90, 418], [30, 426]])].map((pts, i) => (
        <path key={i} d={catmullRom(pts, false)} fill="none" stroke="#c9a27a" strokeWidth={2.4} strokeLinecap="round" opacity={0.7} />
      ))}
      {REFERENCIAS.map((c, i) => <path key={i} d={fita(c)} fill={COR_REF} />)}

      {ORDEM_DESENHO.map((k) => {
        const g = GEOMETRIA_CAROTIDAS[k];
        return (
          <ArteriaCurva key={k} nome={k} c={CURVAS[k]} maxHalf={Math.max(...[].concat(g.half))}
            v={paraDesenhoArterial(normalizarVaso(vasos[k]))} ativo={selecionada === k} prefixo="car" onSelecionar={onSelecionar} />
        );
      })}

      <Rotulo chave="tbc" txt="T. braquiocefálico" lx={126} ly={482} ancora="end" alvo={[190, 452]} referencia />
      <Rotulo chave="arco" txt="Arco aórtico" lx={490} ly={518} ancora="end" alvo={[318, 518]} referencia />
      <Rotulo chave="scd" txt="A. subclávia" lx={-30} ly={448} ancora="start" alvo={[20, 424]} referencia />
      <Rotulo chave="sce" txt="A. subclávia" lx={490} ly={448} ancora="end" alvo={[440, 418]} referencia />
      {ORDEM_DESENHO.map((k) => {
        const [txt, ly] = GEOMETRIA_CAROTIDAS[k].rotulo;
        const direito = DIREITOS.includes(k);
        return (
          <Rotulo key={k} chave={k} txt={txt} lx={direito ? 86 : 374} ly={ly} ancora={direito ? "end" : "start"}
            alvo={alvoRotulo(k, ly)} ativo={selecionada === k} onSelecionar={onSelecionar} />
        );
      })}
      <text x={CAR_X0 + 6} y={14} fontFamily="sans-serif" fontSize="10" fontWeight="bold" fill="#5c6b78">DIREITA</text>
      <text x={CAR_X0 + CAR_W - 6} y={14} fontFamily="sans-serif" fontSize="10" fontWeight="bold" fill="#5c6b78" textAnchor="end">ESQUERDA</text>
      <text x={CAR_X0 + CAR_W - 6} y={CAR_H - 8} fontFamily="monospace" fontSize="12" textAnchor="end" fill="#5c6b78">Visão anterior</text>
    </svg>
  );
}

// ---------- Legenda ----------
export const ITENS_LEGENDA_CAROTIDAS = [
  ["Fluxo normal", COR_ART.normal],
  ["Hipercinético", COR_ART.hipercinetico],
  ["Hipocinético", COR_ART.hipocinetico],
  ["Oclusão", COR_ART.ocluida],
];

function LegendaCarotidas() {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 10px", justifyContent: "center", fontSize: 11, color: "#5c6b78" }}>
      {ITENS_LEGENDA_CAROTIDAS.map(([t, c]) => (
        <span key={t} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
          <span style={{ width: 14, height: 6, background: c, borderRadius: 3, display: "inline-block" }} /> {t}
        </span>
      ))}
      <span>pontos brancos = ateromatose</span>
      <span>triângulos = estenose (branco lipídica, cinza calcificada, contorno cinza mista)</span>
      <span>malha = stent (laranja = reestenose)</span>
      <span>linha branca = dissecção</span>
      <span>dilatação = aneurisma</span>
    </div>
  );
}

// ---------- PDF ----------
function hexParaRgb(hex) {
  const m = hex.replace("#", "");
  return { r: parseInt(m.substring(0, 2), 16), g: parseInt(m.substring(2, 4), 16), b: parseInt(m.substring(4, 6), 16) };
}

// Anexa o mapa de carótidas e vertebrais (uma página A4) a um jsPDF já existente.
export async function adicionarMapaCarotidasAoPdf(doc, vessels, { nome, data } = {}) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const svg = renderToStaticMarkup(<DesenhoCarotidas vessels={vessels} width={CAR_W * 2} height={CAR_H * 2} />);
  const dataUrl = await svgParaImagemDataUrl(svg, CAR_W * 2, CAR_H * 2);

  doc.addPage();
  let y = 16;
  doc.setFontSize(13);
  doc.setFont(undefined, "bold");
  doc.text("Mapeamento — Carótidas e Vertebrais", pageWidth / 2, y, { align: "center" });
  y += 6;
  doc.setFont(undefined, "normal");
  if (nome) {
    doc.setFontSize(9);
    doc.text(`Paciente: ${nome}${data ? "  •  " + data : ""}`, pageWidth / 2, y, { align: "center" });
    y += 5;
  }
  const larguraMm = 160;
  const alturaMm = larguraMm * (CAR_H / CAR_W);
  doc.addImage(dataUrl, "JPEG", (pageWidth - larguraMm) / 2, y, larguraMm, alturaMm);
  y += alturaMm + 7;

  doc.setFontSize(8.5);
  const larguraItens = ITENS_LEGENDA_CAROTIDAS.reduce((acc, [t]) => acc + 6 + doc.getTextWidth(t) + 8, -8);
  let x = (pageWidth - larguraItens) / 2;
  ITENS_LEGENDA_CAROTIDAS.forEach(([t, cor]) => {
    const rgb = hexParaRgb(cor);
    doc.setFillColor(rgb.r, rgb.g, rgb.b);
    doc.rect(x, y - 2.6, 4, 2, "F");
    doc.setTextColor(90, 100, 110);
    doc.text(t, x + 6, y);
    x += 6 + doc.getTextWidth(t) + 8;
  });
  doc.setFontSize(7.5);
  y += 4.5;
  doc.text("Pontos brancos = ateromatose   ·   triângulos = estenose (branco lipídica, cinza calcificada, contorno cinza mista)", pageWidth / 2, y, { align: "center" });
  y += 4;
  doc.text("Malha = stent (laranja = reestenose)   ·   linha branca = dissecção   ·   dilatação = aneurisma", pageWidth / 2, y, { align: "center" });
  doc.setTextColor(0, 0, 0);
}

// ---------- VENO.AI Map ----------
// Mesmo layout de todos os mapas (MapaLayout): fundo branco e a caixa do vaso
// ao lado do desenho (ou subindo da parte de baixo no celular).
export default function CarotidasMapaInterativo({
  aberto, onFechar, vessels, onChange, nome, data,
  onSalvarExame, onSalvarTXT, onSalvarPDF, incluirMapaPdf, onIncluirMapaPdf, embutido
}) {
  const [selected, setSelected] = useState(null);
  const [mostrarPreview, setMostrarPreview] = useState(false);

  if (!aberto) return null;

  const selecionado = selected ? normalizarVaso(vessels[selected]) : null;

  function handleSalvarExameClick() {
    if (!nome || !data) {
      alert("Preencha nome e data no formulário antes de salvar o exame!");
      return;
    }
    onSalvarExame();
  }

  // Grava só os campos que mudaram (o pai atualiza campo a campo).
  function aplicar(novos) {
    Object.entries(novos).forEach(([campo, valor]) => {
      if (vessels[selected]?.[campo] !== valor) onChange(selected, campo, valor);
    });
  }

  const desenho = (
    <DesenhoCarotidas vessels={vessels} onSelecionar={setSelected} selecionada={selected}
      style={{ display: "block", width: "100%", maxWidth: 560, maxHeight: "72vh" }} />
  );

  const legenda = (
    <>
      {/* Atalho rápido pra selecionar o vaso, sem precisar acertar o traçado */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center", marginBottom: 8 }}>
        {Object.keys(GEOMETRIA_CAROTIDAS).map((key) => (
          <button
            key={key}
            type="button"
            title={NOMES_VASOS[key]}
            onClick={() => setSelected(key)}
            style={{
              background: selected === key ? "#0eb8d0" : "#fff",
              color: selected === key ? "#fff" : "#0a7f91",
              border: "1px solid #0eb8d0",
              borderRadius: 6,
              padding: "5px 10px",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer"
            }}
          >
            {key}
          </button>
        ))}
      </div>
      <LegendaCarotidas />
    </>
  );

  const painel = selected && (
    <CamposCarotida valores={selecionado} onChange={aplicar} comIMT={selected === "ACCD" || selected === "ACCE"} />
  );

  return (
    <>
      <MapaLayout
        embutido={embutido}
        titulo="Carótidas e Vertebrais"
        onFechar={onFechar}
        desenho={desenho}
        legenda={legenda}
        painel={painel}
        tituloPainel={selected ? NOMES_VASOS[selected] : ""}
        onFecharPainel={() => setSelected(null)}
        incluirPdf={incluirMapaPdf}
        onIncluirPdf={onIncluirMapaPdf}
        labelIncluirPdf="Incluir Mapeamento Visual no PDF"
        onVisualizarImagem={() => setMostrarPreview(true)}
        onSalvarTXT={onSalvarTXT}
        onSalvarPDF={onSalvarPDF}
        onSalvarExame={handleSalvarExameClick}
      />
      {mostrarPreview && (
        <PreviewImagemPdf titulo="Mapeamento — Carótidas e Vertebrais" onFechar={() => setMostrarPreview(false)}>
          <div style={{ maxWidth: 640, margin: "0 auto" }}>
            <DesenhoCarotidas vessels={vessels} style={{ display: "block", width: "100%" }} />
          </div>
          <div style={{ marginTop: 8 }}><LegendaCarotidas /></div>
        </PreviewImagemPdf>
      )}
    </>
  );
}
