import React, { useState } from "react";
import jsPDF from "jspdf";

// Nomes completos dos 8 vasos editáveis (iguais aos usados no formulário e no laudo).
export const CAROTIDAS_VESSEL_NAMES = {
  ACCD: "Artéria carótida comum direita",
  ACID: "Artéria carótida interna direita",
  ACED: "Artéria carótida externa direita",
  ACCE: "Artéria carótida comum esquerda",
  ACIE: "Artéria carótida interna esquerda",
  ACEE: "Artéria carótida externa esquerda",
  AVD: "Artéria vertebral direita",
  AVE: "Artéria vertebral esquerda"
};

// Posição das etiquetas clicáveis (px, dentro do painel de 830x800 da ilustração).
const CHIP_POS = {
  ACID: { x: 20, y: 80 }, ACED: { x: 20, y: 160 }, AVD: { x: 20, y: 300 }, ACCD: { x: 20, y: 450 },
  ACIE: { x: 700, y: 80 }, ACEE: { x: 700, y: 160 }, AVE: { x: 700, y: 300 }, ACCE: { x: 700, y: 450 }
};

// Ponto aproximado no meio do traçado de cada vaso + metade do calibre (hw), usado só pro
// estrangulamento de estenose e pra textura de ateromatose (nunca pra posicionar o vaso em si —
// o vaso é sempre a curva fixa definida em VESSEL_CURVES/no SVG).
const ANCHORS = {
  ACCD: { x: 317, y: 367, hw: 11 }, ACID: { x: 308, y: 162, hw: 7.5 }, ACED: { x: 332, y: 207, hw: 6 },
  ACCE: { x: 465, y: 483, hw: 11 }, ACIE: { x: 492, y: 162, hw: 7.5 }, ACEE: { x: 467, y: 207, hw: 6 },
  AVD: { x: 319, y: 272, hw: 4.5 }, AVE: { x: 510, y: 387, hw: 4.5 }
};

// Pontos de controle de cada traçado (iguais ao "d" desenhado no SVG), usados pra amostrar a
// textura da ateromatose acompanhando a parede interna do vaso.
const VESSEL_CURVES = {
  ACCD: [{ type: "C", p: [[320, 480], [318, 400], [316, 320], [315, 255]] }],
  ACID: [{ type: "C", p: [[315, 255], [308, 190], [302, 120], [300, 70]] }],
  ACED: [{ type: "C", p: [[315, 255], [330, 220], [342, 185], [350, 160]] }],
  ACCE: [{ type: "C", p: [[445, 712], [462, 550], [480, 380], [485, 255]] }],
  ACIE: [{ type: "C", p: [[485, 255], [492, 190], [498, 120], [500, 70]] }],
  ACEE: [{ type: "C", p: [[485, 255], [470, 220], [458, 185], [450, 160]] }],
  AVD: [{ type: "Q", p: [[280, 465], [310, 380], [350, 290]] }, { type: "Q", p: [[350, 290], [360, 180], [358, 80]] }],
  AVE: [{ type: "Q", p: [[548, 695], [505, 500], [490, 290]] }, { type: "Q", p: [[490, 290], [475, 180], [472, 80]] }]
};

// Cor do vaso: só status/fluxo. Ateromatose e estenose nunca mudam a cor do vaso em si.
function colorFor(v) {
  if (v.status === "ocluída") return "#000000";
  if (v.fluxo === "hipercinético") return "#7b241c";
  if (v.fluxo === "hipocinético") return "#e57373";
  return "#c0392b";
}

// Cor do ícone de estrangulamento vem do tipo de placa (a % de estenose já é representada
// pelo quanto o ápice do triângulo se aproxima do centro, ver pinchFor).
function plaqueIconStyle(v) {
  if (v.tipoPlaca === "lipídica") return { fill: "#ffffff", stroke: "#ffffff" };
  if (v.tipoPlaca === "calcificada") return { fill: "#9aa5b1", stroke: "#6b7684" };
  if (v.tipoPlaca === "mista") return { fill: "#ffffff", stroke: "#6b7684" };
  return { fill: "#ffffff", stroke: "#9aa5b1" }; // tipo ainda não selecionado
}

// Amostra pontos + tangente ao longo da curva do vaso.
function sampleCurve(key, n) {
  const segs = VESSEL_CURVES[key];
  const perSeg = Math.max(2, Math.floor(n / segs.length));
  const pts = [];
  segs.forEach((seg) => {
    for (let i = 0; i <= perSeg; i++) {
      const t = i / perSeg;
      const mt = 1 - t;
      let x, y, dx, dy;
      if (seg.type === "C") {
        const [p0, p1, p2, p3] = seg.p;
        x = mt*mt*mt*p0[0] + 3*mt*mt*t*p1[0] + 3*mt*t*t*p2[0] + t*t*t*p3[0];
        y = mt*mt*mt*p0[1] + 3*mt*mt*t*p1[1] + 3*mt*t*t*p2[1] + t*t*t*p3[1];
        dx = 3*mt*mt*(p1[0]-p0[0]) + 6*mt*t*(p2[0]-p1[0]) + 3*t*t*(p3[0]-p2[0]);
        dy = 3*mt*mt*(p1[1]-p0[1]) + 6*mt*t*(p2[1]-p1[1]) + 3*t*t*(p3[1]-p2[1]);
      } else {
        const [p0, p1, p2] = seg.p;
        x = mt*mt*p0[0] + 2*mt*t*p1[0] + t*t*p2[0];
        y = mt*mt*p0[1] + 2*mt*t*p1[1] + t*t*p2[1];
        dx = 2*mt*(p1[0]-p0[0]) + 2*t*(p2[0]-p1[0]);
        dy = 2*mt*(p1[1]-p0[1]) + 2*t*(p2[1]-p1[1]);
      }
      pts.push({ x, y, dx, dy });
    }
  });
  return pts;
}

// Posição segura dentro do vaso: 72% do meio-calibre é a "parede interna" (já com folga da
// borda real), e towardCenter (0 a 1) aproxima do centro a partir dali. Usada pela textura da
// ateromatose e pelo ícone de estrangulamento da estenose.
function wallPos(hw, towardCenter) {
  return hw * 0.72 * (1 - towardCenter);
}

// Ateromatose: textura em pontos nas paredes internas (nunca cruza o centro/lúmen), sem mudar a
// cor do vaso. Leve = pontos pequenos e esparsos, bem rentes à parede; severa = pontos maiores,
// densos e avançando mais pro lúmen (áspero).
function textureFor(key, v) {
  const cfg = v.ateromatose === "severa" ? { everyN: 1, toward: 0.7, dot: 3.2, opacity: 0.85 }
    : v.ateromatose === "moderada" ? { everyN: 2, toward: 0.4, dot: 2.2, opacity: 0.6 }
    : v.ateromatose === "discreta" ? { everyN: 4, toward: 0.12, dot: 1.4, opacity: 0.35 }
    : null;
  if (!cfg) return { d: "", width: 0, opacity: 0 };
  const hw = (ANCHORS[key] && ANCHORS[key].hw) || 6;
  const off = wallPos(hw, cfg.toward);
  const pts = sampleCurve(key, 30);
  let d = "";
  pts.forEach((pt, i) => {
    if (i % cfg.everyN !== 0) return;
    const len = Math.sqrt(pt.dx*pt.dx + pt.dy*pt.dy) || 1;
    const nx = -pt.dy / len, ny = pt.dx / len;
    const lx = pt.x - nx*off, ly = pt.y - ny*off;
    d += `M ${lx.toFixed(1)},${ly.toFixed(1)} L ${lx.toFixed(1)},${ly.toFixed(1)} `;
    const rx = pt.x + nx*off, ry = pt.y + ny*off;
    d += `M ${rx.toFixed(1)},${ry.toFixed(1)} L ${rx.toFixed(1)},${ry.toFixed(1)} `;
  });
  return { d, width: cfg.dot, opacity: cfg.opacity };
}

// Estenose: um triângulo em cada parede interna do vaso (base rente à parede, igual à textura
// da ateromatose), com o ápice se aproximando do centro conforme a faixa de %.
function pinchFor(key, v) {
  const a = ANCHORS[key];
  if (!a || v.estenose === "ausente") return { left: "", right: "" };
  const apexToward = v.estenose === ">70%" ? 0.95 : v.estenose === "50% a 70%" ? 0.8 : 0.55;
  const base = wallPos(a.hw, 0);
  const apex = wallPos(a.hw, apexToward);
  const span = a.hw * 1.6;
  const left = `M ${a.x-base},${a.y-span} L ${a.x-apex},${a.y} L ${a.x-base},${a.y+span} Z`;
  const right = `M ${a.x+base},${a.y-span} L ${a.x+apex},${a.y} L ${a.x+base},${a.y+span} Z`;
  return { left, right };
}

const defaultVessel = () => ({ status: "pérvia", fluxo: "sem alteração", ateromatose: "ausente", estenose: "ausente", tipoPlaca: "", observacao: "" });

// Monta o SVG completo (string) da ilustração. detalhado=false pula textura/estrangulamento
// (usado na miniatura "mesmo esquema no laudo em PDF").
export function construirSvgCarotidas(vessels, { detalhado = true, width = "100%", height = "100%" } = {}) {
  const v = (key) => vessels[key] || defaultVessel();
  const colorACCD = colorFor(v("ACCD"));
  const colorACID = colorFor(v("ACID"));
  const colorACED = colorFor(v("ACED"));
  const colorACCE = colorFor(v("ACCE"));
  const colorACIE = colorFor(v("ACIE"));
  const colorACEE = colorFor(v("ACEE"));
  const colorAVD = colorFor(v("AVD"));
  const colorAVE = colorFor(v("AVE"));

  let detalhesSvg = "";
  if (detalhado) {
    const chaves = Object.keys(CHIP_POS);
    const texturas = chaves.map((k) => {
      const tex = textureFor(k, v(k));
      if (!tex.d) return "";
      return `<path d="${tex.d}" fill="none" stroke="#ffffff" stroke-width="${tex.width}" stroke-linecap="round" opacity="${tex.opacity}"></path>`;
    }).join("");
    const estrangulamentos = chaves.map((k) => {
      const pinch = pinchFor(k, v(k));
      if (!pinch.left) return "";
      const style = plaqueIconStyle(v(k));
      return `<path d="${pinch.left}" fill="${style.fill}" stroke="${style.stroke}" stroke-width="1.5"></path>`
        + `<path d="${pinch.right}" fill="${style.fill}" stroke="${style.stroke}" stroke-width="1.5"></path>`;
    }).join("");
    detalhesSvg = texturas + estrangulamentos;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 850 820" style="display:block;">
    <text x="145" y="50" text-anchor="middle" font-size="12" font-weight="700" letter-spacing="1" fill="#5c6b78">DIREITA</text>
    <text x="705" y="50" text-anchor="middle" font-size="12" font-weight="700" letter-spacing="1" fill="#5c6b78">ESQUERDA</text>

    <path d="M 240,820 C 240,710 290,670 400,668 C 460,668 510,675 545,700 C 570,718 580,750 575,790 C 573,805 570,815 560,820 Z" fill="#c0392b" stroke="#7a2119" stroke-width="2"></path>
    <text x="380" y="775" text-anchor="middle" font-size="12.5" font-weight="700" fill="#ffffff">Arco Aórtico</text>

    <path d="M 350,710 L 320,480" style="stroke:#c0392b; stroke-width:28; stroke-linecap:round; fill:none;"></path>
    <ellipse cx="320" cy="480" rx="13" ry="16" style="fill:#c0392b;"></ellipse>
    <text x="35" y="548" font-size="12.5" font-weight="700" fill="#4a5568">Tronco</text>
    <text x="15" y="564" font-size="12.5" font-weight="700" fill="#4a5568">braquiocefálico</text>
    <line x1="150" y1="556" x2="305" y2="510" stroke="#9aa5b1" stroke-width="1.2"></line>

    <path d="M 320,480 C 270,465 220,450 110,420" style="stroke:#c0392b; stroke-width:20; stroke-linecap:round; fill:none;"></path>
    <path d="M 525,715 C 565,680 610,630 690,580" style="stroke:#c0392b; stroke-width:20; stroke-linecap:round; fill:none;"></path>
    <text x="15" y="402" font-size="12.5" font-weight="700" fill="#4a5568">A. subclávia D</text>
    <line x1="95" y1="392" x2="200" y2="453" stroke="#9aa5b1" stroke-width="1.2"></line>
    <text x="600" y="640" font-size="12.5" font-weight="700" fill="#4a5568">A. subclávia E</text>
    <line x1="645" y1="630" x2="640" y2="595" stroke="#9aa5b1" stroke-width="1.2"></line>

    <path d="M 280,465 Q 310,380 350,290 Q 360,180 358,80" style="stroke:${colorAVD}; stroke-width:9; stroke-linecap:round; fill:none;"></path>
    <path d="M 548,695 Q 505,500 490,290 Q 475,180 472,80" style="stroke:${colorAVE}; stroke-width:9; stroke-linecap:round; fill:none;"></path>

    <path d="M 320,480 C 318,400 316,320 315,255" style="stroke:${colorACCD}; stroke-width:22; stroke-linecap:round; fill:none;"></path>
    <ellipse cx="315" cy="255" rx="16" ry="21" style="fill:${colorACCD};"></ellipse>
    <path d="M 315,255 C 308,190 302,120 300,70" style="stroke:${colorACID}; stroke-width:15; stroke-linecap:round; fill:none;"></path>
    <path d="M 315,255 C 330,220 342,185 350,160" style="stroke:${colorACED}; stroke-width:12; stroke-linecap:round; fill:none;"></path>
    <path d="M 342,168 C 338,160 336,148 335,138" style="stroke:${colorACED}; stroke-width:5; stroke-linecap:round; fill:none;"></path>

    <path d="M 445,712 C 462,550 480,380 485,255" style="stroke:${colorACCE}; stroke-width:22; stroke-linecap:round; fill:none;"></path>
    <ellipse cx="485" cy="255" rx="16" ry="21" style="fill:${colorACCE};"></ellipse>
    <path d="M 485,255 C 492,190 498,120 500,70" style="stroke:${colorACIE}; stroke-width:15; stroke-linecap:round; fill:none;"></path>
    <path d="M 485,255 C 470,220 458,185 450,160" style="stroke:${colorACEE}; stroke-width:12; stroke-linecap:round; fill:none;"></path>
    <path d="M 458,168 C 462,160 464,148 465,138" style="stroke:${colorACEE}; stroke-width:5; stroke-linecap:round; fill:none;"></path>

    ${detalhado ? `
    <line x1="150" y1="97" x2="303" y2="130" stroke="#9aa5b1" stroke-width="1.5"></line>
    <line x1="150" y1="177" x2="340" y2="175" stroke="#9aa5b1" stroke-width="1.5"></line>
    <line x1="150" y1="317" x2="345" y2="280" stroke="#9aa5b1" stroke-width="1.5"></line>
    <line x1="150" y1="467" x2="317" y2="400" stroke="#9aa5b1" stroke-width="1.5"></line>
    <line x1="700" y1="97" x2="497" y2="130" stroke="#9aa5b1" stroke-width="1.5"></line>
    <line x1="700" y1="177" x2="460" y2="175" stroke="#9aa5b1" stroke-width="1.5"></line>
    <line x1="700" y1="317" x2="505" y2="455" stroke="#9aa5b1" stroke-width="1.5"></line>
    <line x1="700" y1="467" x2="475" y2="450" stroke="#9aa5b1" stroke-width="1.5"></line>
    ` : ""}

    ${detalhesSvg}
  </svg>`;
}

function svgParaImagemDataUrl(svgString, largura, altura) {
  return new Promise((resolve, reject) => {
    const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      const escala = 2;
      const canvas = document.createElement("canvas");
      canvas.width = largura * escala;
      canvas.height = altura * escala;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.9));
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
    img.src = url;
  });
}

function hexParaRgb(hex) {
  const m = hex.replace("#", "");
  return { r: parseInt(m.substring(0, 2), 16), g: parseInt(m.substring(2, 4), 16), b: parseInt(m.substring(4, 6), 16) };
}

function desenharLegendaCarotidasPdf(doc, pageWidth, yInicial) {
  let y = yInicial;
  doc.setFontSize(8.5);
  const corVaso = [
    ["Pérvia / normal", "#c0392b"],
    ["Fluxo hipocinético", "#e57373"],
    ["Fluxo hipercinético", "#7b241c"],
    ["Oclusão", "#000000"]
  ];
  let lx = (pageWidth - 170) / 2;
  corVaso.forEach(([label, cor]) => {
    const rgb = hexParaRgb(cor);
    doc.setFillColor(rgb.r, rgb.g, rgb.b);
    doc.rect(lx, y - 2.6, 4, 2, "F");
    doc.setTextColor(90, 100, 110);
    doc.text(label, lx + 6, y);
    lx += 6 + doc.getTextWidth(label) + 8;
  });
  doc.setTextColor(0, 0, 0);
  y += 6;

  let fonteExplicativa = 7.5;
  doc.setFontSize(fonteExplicativa);
  const textoExplicativo = "Textura na parede = ateromatose   ·   triângulo nas bordas = estenose (cor conforme o tipo de placa)";
  if (doc.getTextWidth(textoExplicativo) > pageWidth - 20) {
    doc.setFontSize(6.5);
  }
  doc.setTextColor(120, 130, 138);
  doc.text(textoExplicativo, pageWidth / 2, y, { align: "center" });
  doc.setTextColor(0, 0, 0);
  y += 8;
  return y;
}

// Anexa o mapa de carótidas e vertebrais (uma página A4) a um jsPDF já existente. Usado pelo
// laudo principal quando "Incluir Mapeamento Visual no PDF" está marcado.
export async function adicionarMapaCarotidasAoPdf(doc, vessels, { nome, data } = {}) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const svg = construirSvgCarotidas(vessels, { detalhado: true, width: 830, height: 800 });
  const dataUrl = await svgParaImagemDataUrl(svg, 830, 800);

  doc.addPage();
  let y = 16;
  doc.setFontSize(13);
  doc.setFont(undefined, "bold");
  doc.text("Mapa — Carótidas e Vertebrais", pageWidth / 2, y, { align: "center" });
  y += 6;
  if (nome) {
    doc.setFontSize(9);
    doc.setFont(undefined, "normal");
    doc.text(`Paciente: ${nome}${data ? "  •  " + data : ""}`, pageWidth / 2, y, { align: "center" });
    y += 6;
  }
  doc.setFont(undefined, "normal");

  const imgWidthMm = 150;
  const imgHeightMm = imgWidthMm * (800 / 830);
  const x = (pageWidth - imgWidthMm) / 2;
  doc.addImage(dataUrl, "JPEG", x, y, imgWidthMm, imgHeightMm);
  y += imgHeightMm + 6;

  desenharLegendaCarotidasPdf(doc, pageWidth, y);
}

function CampoSelect({ label, value, onChange, options }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 160 }}>
      <span style={{ fontSize: 12, fontWeight: 700, color: "#cfe3ea" }}>{label}</span>
      <select
        value={value}
        onChange={onChange}
        style={{ padding: "9px 10px", borderRadius: 6, border: "1px solid #4fd8ec", background: "#fff", color: "#222", fontSize: 13 }}
      >
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </label>
  );
}

export default function CarotidasMapaInterativo({ aberto, onFechar, vessels, onChange, nome, data }) {
  const [selected, setSelected] = useState("ACCD");

  if (!aberto) return null;

  const selectedVessel = vessels[selected] || defaultVessel();
  const isOccluded = selectedVessel.status === "ocluída";
  const showClinicalFields = !isOccluded;
  const showEstenoseCampos = selectedVessel.estenose && selectedVessel.estenose !== "ausente";

  function handleStatusChange(e) {
    const novoStatus = e.target.value;
    onChange(selected, "status", novoStatus);
    if (novoStatus === "ocluída") {
      onChange(selected, "fluxo", "sem alteração");
      onChange(selected, "ateromatose", "ausente");
      onChange(selected, "estenose", "ausente");
      onChange(selected, "tipoPlaca", "");
    }
  }

  function handleEstenoseChange(e) {
    const novaEstenose = e.target.value;
    onChange(selected, "estenose", novaEstenose);
    if (novaEstenose === "ausente") {
      onChange(selected, "tipoPlaca", "");
    }
  }

  const svgIlustracao = construirSvgCarotidas(vessels, { detalhado: true });
  const svgMini = construirSvgCarotidas(vessels, { detalhado: false });

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(8, 14, 22, 0.78)",
        zIndex: 2000,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        overflowY: "auto",
        padding: "clamp(12px, 2vw, 28px) 12px"
      }}
      onClick={onFechar}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 1360,
          background: "linear-gradient(120deg,#101824 0%,#1c2740 100%)",
          color: "#fff",
          borderRadius: 16,
          boxShadow: "0 24px 60px rgba(0,0,0,0.5)",
          padding: "clamp(16px, 3vw, 28px)",
          display: "flex",
          flexDirection: "column",
          gap: 14
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
          <div>
            <div style={{ fontSize: "clamp(16px, 2.5vw, 20px)", fontWeight: 700, color: "#4fd8ec" }}>Mapa Interativo — Carótidas e Vertebrais</div>
            <div style={{ fontSize: 12.5, color: "#8fb3bd", marginTop: 4 }}>
              Origem real dos vasos (arco aórtico → tronco braquiocefálico / subclávias) até a bifurcação cervical. Clique numa etiqueta pra editar o vaso.
            </div>
          </div>
          <button
            onClick={onFechar}
            style={{ background: "rgba(79,216,236,0.12)", border: "1px solid rgba(79,216,236,0.4)", borderRadius: 8, padding: "8px 14px", fontSize: 12.5, color: "#4fd8ec", fontWeight: 600, cursor: "pointer" }}
          >
            Fechar
          </button>
        </div>

        {/* Body */}
        <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
          {/* LEFT: illustration + legend */}
          <div style={{ flex: "1 1 520px", maxWidth: 860, display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
            <div style={{ position: "relative", width: "100%", maxWidth: 830, aspectRatio: "830 / 800", background: "#fff", border: "1px solid #d7dee3", borderRadius: 14, boxShadow: "0 2px 10px rgba(0,0,0,0.35)", overflow: "hidden" }}>
              <div style={{ position: "absolute", inset: 0 }} dangerouslySetInnerHTML={{ __html: svgIlustracao }} />
              {Object.keys(CHIP_POS).map((key) => {
                const isSel = selected === key;
                const v = vessels[key] || defaultVessel();
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelected(key)}
                    aria-label={CAROTIDAS_VESSEL_NAMES[key]}
                    style={{
                      position: "absolute",
                      left: `${(CHIP_POS[key].x / 830) * 100}%`,
                      top: `${(CHIP_POS[key].y / 800) * 100}%`,
                      width: 130,
                      height: 34,
                      borderRadius: 8,
                      background: "#1a2434",
                      border: isSel ? "2px solid #ffffff" : "1px solid #3a4a64",
                      boxShadow: isSel ? "0 0 0 4px rgba(255,255,255,0.2), 0 2px 8px rgba(0,0,0,0.4)" : "0 2px 6px rgba(0,0,0,0.3)",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "0 10px",
                      cursor: "pointer"
                    }}
                  >
                    <span style={{ width: 10, height: 10, borderRadius: "50%", background: colorFor(v), flexShrink: 0 }}></span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#eaf3f6" }}>{key}</span>
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div style={{ width: "100%", boxSizing: "border-box", display: "flex", flexDirection: "column", gap: 6, background: "#fff", border: "1px solid #d7dee3", borderRadius: 10, padding: "12px 16px" }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#5c6b78" }}>LEGENDA</div>
              <div style={{ fontSize: 10.5, fontWeight: 700, color: "#9aa5b1", textTransform: "uppercase", letterSpacing: 0.4 }}>Cor do vaso — status / fluxo</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
                <LegendDot cor="#c0392b" label="Pérvia / normal" />
                <LegendDot cor="#e57373" label="Fluxo hipocinético" />
                <LegendDot cor="#7b241c" label="Fluxo hipercinético" />
                <LegendDot cor="#000000" label="Oclusão" />
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ width: 16, height: 3, background: "#9aa5b1", display: "inline-block" }}></span>
                  <span style={{ fontSize: 12, color: "#6b7684" }}>Estrutura de contexto (não editável)</span>
                </span>
              </div>
              <div style={{ fontSize: 10.5, fontWeight: 700, color: "#9aa5b1", textTransform: "uppercase", letterSpacing: 0.4, marginTop: 4 }}>Cor do ícone de estrangulamento — tipo de placa</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ width: 12, height: 12, borderRadius: 3, background: "#ffffff", border: "1.5px solid #c7ced6", display: "inline-block" }}></span>
                  <span style={{ fontSize: 12, color: "#2d3a4a" }}>Lipídica (branco)</span>
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ width: 12, height: 12, borderRadius: 3, background: "#9aa5b1", display: "inline-block" }}></span>
                  <span style={{ fontSize: 12, color: "#2d3a4a" }}>Calcificada (cinza)</span>
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ width: 12, height: 12, borderRadius: 3, background: "#ffffff", border: "1.5px solid #6b7684", display: "inline-block" }}></span>
                  <span style={{ fontSize: 12, color: "#2d3a4a" }}>Mista (branco, contorno cinza)</span>
                </span>
              </div>
              <div style={{ fontSize: 11.5, color: "#6b7684", marginTop: 4, lineHeight: 1.5 }}>
                <b style={{ color: "#2d3a4a" }}>Ateromatose</b> não muda cor nenhuma — aparece como textura só nas paredes internas do vaso (nunca cruza o centro): discreta é rente à borda e leve, moderada é média, severa avança mais pro lúmen e é densa/áspera. <b style={{ color: "#2d3a4a" }}>Estenose</b> não muda a cor do vaso — o quanto o ícone de estrangulamento aperta vem da faixa de %, e a cor do ícone vem do tipo de placa (acima).
              </div>
            </div>
          </div>

          {/* RIGHT: form for selected vessel + mini PDF preview */}
          <div style={{ flex: "1 1 380px", display: "flex", flexDirection: "column", gap: 14, minWidth: 0 }}>
            <div style={{ background: "#18243a", border: "1px solid rgba(79,216,236,0.3)", borderRadius: 12, padding: "20px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#4fd8ec" }}>{CAROTIDAS_VESSEL_NAMES[selected]}</div>

              <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                <CampoSelect label="Status" value={selectedVessel.status} onChange={handleStatusChange} options={["pérvia", "ocluída"]} />
              </div>

              {isOccluded && (
                <div style={{ background: "rgba(0,0,0,0.3)", border: "1px solid #3a3a3a", borderRadius: 8, padding: "10px 14px", fontSize: 12.5, color: "#cfd3d8" }}>
                  Vaso ocluído — fluxo, ateromatose, estenose e tipo de placa não se aplicam e ficam ocultos.
                </div>
              )}

              {showClinicalFields && (
                <>
                  <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                    <CampoSelect
                      label="Fluxo"
                      value={selectedVessel.fluxo}
                      onChange={(e) => onChange(selected, "fluxo", e.target.value)}
                      options={["sem alteração", "hipocinético", "hipercinético"]}
                    />
                    <CampoSelect
                      label="Ateromatose"
                      value={selectedVessel.ateromatose}
                      onChange={(e) => onChange(selected, "ateromatose", e.target.value)}
                      options={["ausente", "discreta", "moderada", "severa"]}
                    />
                    <CampoSelect
                      label="Estenose"
                      value={selectedVessel.estenose}
                      onChange={handleEstenoseChange}
                      options={["ausente", "<50%", "50% a 70%", ">70%"]}
                    />
                  </div>

                  {showEstenoseCampos && (
                    <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                      <label style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 160 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: "#cfe3ea" }}>Tipo de placa</span>
                        <select
                          value={selectedVessel.tipoPlaca || ""}
                          onChange={(e) => onChange(selected, "tipoPlaca", e.target.value)}
                          style={{ padding: "9px 10px", borderRadius: 6, border: "1px solid #4fd8ec", background: "#fff", color: "#222", fontSize: 13 }}
                        >
                          <option value="">Selecione...</option>
                          <option value="lipídica">lipídica</option>
                          <option value="calcificada">calcificada</option>
                          <option value="mista">mista</option>
                        </select>
                      </label>
                    </div>
                  )}
                </>
              )}

              <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#cfe3ea" }}>Observação</span>
                <input
                  type="text"
                  value={selectedVessel.observacao || ""}
                  onChange={(e) => onChange(selected, "observacao", e.target.value)}
                  placeholder="Anotações livres..."
                  style={{ padding: "9px 10px", borderRadius: 6, border: "1px solid #4fd8ec", background: "#fff", color: "#222", fontSize: 13 }}
                />
              </label>
            </div>

            <div style={{ background: "rgba(79,216,236,0.08)", border: "1px solid rgba(79,216,236,0.25)", borderRadius: 10, padding: "12px 16px", fontSize: 12.5, color: "#bfe4ec", lineHeight: 1.5 }}>
              O tronco braquiocefálico, as subclávias e o arco da aorta aparecem só como referência anatômica, sempre em vermelho — não são campos do laudo. Nos 8 vasos editáveis, a cor do vaso reflete só status/fluxo. Estenose e ateromatose não mudam essa cor — aparecem como ícone de estrangulamento e textura na parede, cada um com sua própria cor/intensidade.
            </div>

            <div style={{ display: "flex", gap: 20, alignItems: "center", background: "#18243a", border: "1px solid #2a3548", borderRadius: 10, padding: "14px 18px", flexWrap: "wrap" }}>
              <div style={{ width: 150, height: 144, flexShrink: 0, background: "#fff", border: "1px solid #d7dee3", borderRadius: 8, overflow: "hidden" }} dangerouslySetInnerHTML={{ __html: svgMini }} />
              <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#4fd8ec" }}>Mesmo esquema no laudo em PDF</div>
                <div style={{ fontSize: 12.5, color: "#9fc3cc", lineHeight: 1.5 }}>
                  Marque "Incluir Mapeamento Visual no PDF" (ao lado do laudo) pra anexar este mesmo desenho ao PDF final.
                </div>
              </div>
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {Object.keys(CHIP_POS).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelected(key)}
                  style={{
                    background: selected === key ? "#0eb8d0" : "#1a2434",
                    color: "#fff",
                    border: "1px solid #2a3548",
                    borderRadius: 6,
                    padding: "4px 10px",
                    fontSize: 11.5,
                    cursor: "pointer"
                  }}
                >
                  {key}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function LegendDot({ cor, label }) {
  return (
    <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <span style={{ width: 12, height: 12, borderRadius: "50%", background: cor, display: "inline-block" }}></span>
      <span style={{ fontSize: 12, color: "#2d3a4a" }}>{label}</span>
    </span>
  );
}
