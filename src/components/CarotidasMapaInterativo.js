import React, { useState } from "react";
import jsPDF from "jspdf";
import MapaLayout, { PreviewImagemPdf } from "./MapaLayout";

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

// Posição dentro do vaso: 92% do meio-calibre encosta na parede/periferia real do vaso, e
// towardCenter (0 a 1) aproxima do centro a partir dali. Usada pela textura da ateromatose e
// pelo ícone de estrangulamento da estenose.
function wallPos(hw, towardCenter) {
  return hw * 0.92 * (1 - towardCenter);
}

// Ateromatose: textura em pontos nas paredes internas, sempre contida na periferia/parede do
// vaso (nunca chega perto do centro/lúmen), sem mudar a cor do vaso. Os pontos têm sempre a
// mesma espessura (igual à discreta); o que muda entre os graus é o espaçamento entre eles
// (severa = espaçamento menor, mais pontos) e o quanto avançam rumo ao centro.
function textureFor(key, v) {
  const cfg = v.ateromatose === "severa" ? { everyN: 1, toward: 0.42, dot: 1.4, opacity: 0.85 }
    : v.ateromatose === "moderada" ? { everyN: 2, toward: 0.3, dot: 1.4, opacity: 0.6 }
    : v.ateromatose === "discreta" ? { everyN: 4, toward: 0.15, dot: 1.4, opacity: 0.35 }
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

// Estenose: um triângulo em cada parede interna do vaso. A base sempre encosta na
// periferia/parede do vaso (igual pra qualquer %); o ápice é que avança rumo ao centro conforme
// a faixa de % -- quanto maior a estenose, mais perto um ápice fica do outro.
function pinchFor(key, v) {
  const a = ANCHORS[key];
  if (!a || v.estenose === "ausente") return { left: "", right: "" };
  const apexToward = v.estenose === ">70%" ? 0.78 : v.estenose === "50% a 70%" ? 0.48 : 0.15;
  const base = wallPos(a.hw, 0);
  const apex = wallPos(a.hw, apexToward);
  const span = a.hw * 1.6;
  const left = `M ${a.x-base},${a.y-span} L ${a.x-apex},${a.y} L ${a.x-base},${a.y+span} Z`;
  const right = `M ${a.x+base},${a.y-span} L ${a.x+apex},${a.y} L ${a.x+base},${a.y+span} Z`;
  return { left, right };
}

const defaultVessel = () => ({ status: "pérvia", fluxo: "sem alteração", ateromatose: "ausente", estenose: "ausente", tipoPlaca: "", stent: "ausente", observacao: "" });

// Traçado (mesmo "d") e espessura de cada vaso editável, usados só pra desenhar a malha do stent
// por cima do vaso (overlay com a mesma geometria do próprio vaso, "preenchendo" a artéria).
const VESSEL_SHAPE = {
  ACCD: { paths: [{ d: "M 320,480 C 318,400 316,320 315,255", width: 22 }], ellipse: { cx: 315, cy: 255, rx: 16, ry: 21 } },
  ACID: { paths: [{ d: "M 315,255 C 308,190 302,120 300,70", width: 15 }] },
  ACED: { paths: [{ d: "M 315,255 C 330,220 342,185 350,160", width: 12 }, { d: "M 342,168 C 338,160 336,148 335,138", width: 5 }] },
  ACCE: { paths: [{ d: "M 445,712 C 462,550 480,380 485,255", width: 22 }], ellipse: { cx: 485, cy: 255, rx: 16, ry: 21 } },
  ACIE: { paths: [{ d: "M 485,255 C 492,190 498,120 500,70", width: 15 }] },
  ACEE: { paths: [{ d: "M 485,255 C 470,220 458,185 450,160", width: 12 }, { d: "M 458,168 C 462,160 464,148 465,138", width: 5 }] },
  AVD: { paths: [{ d: "M 280,465 Q 310,380 350,290 Q 360,180 358,80", width: 9 }] },
  AVE: { paths: [{ d: "M 548,695 Q 505,500 490,290 Q 475,180 472,80", width: 9 }] }
};

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

  const chaves = Object.keys(CHIP_POS);

  // Stent: malha (crosshatch) por cima do próprio traçado do vaso, preenchendo-o — independe de
  // detalhado, igual à cor do vaso, pra aparecer tanto na ilustração principal quanto na miniatura.
  const stentsSvg = chaves.map((k) => {
    if (v(k).stent !== "presente") return "";
    const shape = VESSEL_SHAPE[k];
    if (!shape) return "";
    let s = shape.paths.map((p) =>
      `<path d="${p.d}" fill="none" stroke="url(#veno-stent-mesh)" stroke-width="${p.width}" stroke-linecap="round"></path>`
    ).join("");
    if (shape.ellipse) {
      s += `<ellipse cx="${shape.ellipse.cx}" cy="${shape.ellipse.cy}" rx="${shape.ellipse.rx}" ry="${shape.ellipse.ry}" fill="url(#veno-stent-mesh)"></ellipse>`;
    }
    return s;
  }).join("");

  let detalhesSvg = "";
  if (detalhado) {
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
    // Etiqueta com o código do vaso (mesmo texto dos botões clicáveis do modal, que ficam por
    // cima e a escondem na tela — aqui garante que o nome do vaso apareça quando o SVG é
    // rasterizado sozinho, como no mapa exportado pro PDF). Texto simples em preto, sem caixa.
    // CHIP_POS foi calibrado pra uma caixa de 830x800 (é o que o overlay HTML do modal usa pra
    // posicionar os botões como % daquele tamanho); o viewBox real do SVG é 850x820, então as
    // coordenadas precisam ser escaladas pra esse espaço pra bater pixel a pixel com os botões.
    const etiquetas = chaves.map((k) => {
      const x = (CHIP_POS[k].x / 830) * 850;
      const y = (CHIP_POS[k].y / 800) * 820;
      const h = (34 / 800) * 820;
      return `<text x="${x.toFixed(1)}" y="${(y + h / 2 + 4.5).toFixed(1)}" font-size="13" font-weight="700" fill="#000000">${k}</text>`;
    }).join("");
    detalhesSvg = texturas + estrangulamentos + etiquetas;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 850 820" style="display:block;">
    <defs>
      <pattern id="veno-stent-mesh" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <line x1="0" y1="0" x2="0" y2="6" stroke="#f3f6f8" stroke-width="1.6"></line>
        <line x1="0" y1="0" x2="6" y2="0" stroke="#f3f6f8" stroke-width="1.6"></line>
      </pattern>
    </defs>
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

    ${stentsSvg}

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
  const textoExplicativo = "Textura na parede = ateromatose   ·   triângulo nas bordas = estenose (cor conforme o tipo de placa)   ·   malha cobrindo o vaso = stent";
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

const CAMPO_LABEL = { fontSize: 12, fontWeight: 700, color: "#0a7f91" };
const CAMPO_INPUT = { padding: "9px 10px", borderRadius: 6, border: "1.5px solid #0eb8d0", background: "#f7fbff", color: "#222", fontSize: 14 };

function CampoSelect({ label, value, onChange, options }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 150, flex: "1 1 150px" }}>
      <span style={CAMPO_LABEL}>{label}</span>
      <select value={value} onChange={onChange} style={CAMPO_INPUT}>
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </label>
  );
}

function LegendaCarotidas() {
  return (
    <>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center", alignItems: "center" }}>
        <LegendDot cor="#c0392b" label="Pérvia" />
        <LegendDot cor="#e57373" label="Hipocinético" />
        <LegendDot cor="#7b241c" label="Hipercinético" />
        <LegendDot cor="#000000" label="Oclusão" />
      </div>
      <div style={{ fontSize: 11, color: "#5c6b78", lineHeight: 1.4, textAlign: "center", marginTop: 4 }}>
        Textura = ateromatose · triângulo = estenose (branco=lipídica, cinza=calcificada, contorno cinza=mista) · malha = stent.
      </div>
    </>
  );
}

// Mesmo layout de todos os Mapas Interativos (MapaLayout): fundo branco e a
// caixa do vaso ao lado do desenho (ou subindo da parte de baixo no celular).
export default function CarotidasMapaInterativo({
  aberto, onFechar, vessels, onChange, nome, data,
  onSalvarExame, onSalvarTXT, onSalvarPDF, incluirMapaPdf, onIncluirMapaPdf, embutido
}) {
  const [selected, setSelected] = useState(null);
  const [mostrarPreview, setMostrarPreview] = useState(false);

  if (!aberto) return null;

  const selectedVessel = (selected && vessels[selected]) || defaultVessel();
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

  function handleSalvarExameClick() {
    if (!nome || !data) {
      alert("Preencha nome e data no formulário antes de salvar o exame!");
      return;
    }
    onSalvarExame();
  }

  const svgIlustracao = construirSvgCarotidas(vessels, { detalhado: true });

  const desenho = (
    <div style={{ position: "relative", width: "100%", maxWidth: 560, aspectRatio: "850 / 820" }}>
      <div style={{ position: "absolute", inset: 0 }} dangerouslySetInnerHTML={{ __html: svgIlustracao }} />
      {/* Área de toque: clica direto no traçado do vaso. AVD/AVE (mais finos)
          são desenhados por último, pra ficarem por cima no cruzamento com a ACCD/ACCE. */}
      <svg viewBox="0 0 850 820" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
        {["ACID", "ACED", "ACCD", "ACIE", "ACEE", "ACCE", "AVD", "AVE"].map((key) => {
          const shape = VESSEL_SHAPE[key];
          if (!shape) return null;
          const ativo = selected === key;
          return (
            <g key={key} onClick={() => setSelected(key)} style={{ cursor: "pointer" }} aria-label={CAROTIDAS_VESSEL_NAMES[key]}>
              {shape.paths.map((p, i) => (
                <path
                  key={i}
                  d={p.d}
                  fill="none"
                  stroke={ativo ? "#0eb8d0" : "#000"}
                  strokeOpacity={ativo ? 0.4 : 0.001}
                  strokeWidth={Math.max(p.width + 6, 14)}
                  strokeLinecap="round"
                />
              ))}
            </g>
          );
        })}
      </svg>
    </div>
  );

  const legenda = (
    <>
      {/* Atalho rápido pra selecionar o vaso, sem precisar acertar o traçado */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center", marginBottom: 8 }}>
        {Object.keys(CHIP_POS).map((key) => (
          <button
            key={key}
            type="button"
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
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <CampoSelect label="Status" value={selectedVessel.status} onChange={handleStatusChange} options={["pérvia", "ocluída"]} />
        <label style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 140, flex: "1 1 140px" }}>
          <span style={CAMPO_LABEL}>Stent</span>
          <button
            type="button"
            onClick={() => onChange(selected, "stent", selectedVessel.stent === "presente" ? "ausente" : "presente")}
            style={{
              ...CAMPO_INPUT,
              background: selectedVessel.stent === "presente" ? "#0eb8d0" : "#f7fbff",
              color: selectedVessel.stent === "presente" ? "#fff" : "#222",
              fontWeight: 700,
              cursor: "pointer"
            }}
          >
            {selectedVessel.stent === "presente" ? "Presente" : "Ausente"}
          </button>
        </label>
      </div>

      {isOccluded && (
        <div style={{ background: "#f0f4f7", border: "1px solid #dfe6ec", borderRadius: 8, padding: "10px 14px", fontSize: 12.5, color: "#5c6b78" }}>
          Vaso ocluído — fluxo, ateromatose, estenose e tipo de placa não se aplicam e ficam ocultos.
        </div>
      )}

      {showClinicalFields && (
        <>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
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
            <label style={{ display: "flex", flexDirection: "column", gap: 6, maxWidth: 260 }}>
              <span style={CAMPO_LABEL}>Tipo de placa</span>
              <select
                value={selectedVessel.tipoPlaca || ""}
                onChange={(e) => onChange(selected, "tipoPlaca", e.target.value)}
                style={CAMPO_INPUT}
              >
                <option value="">Selecione...</option>
                <option value="lipídica">lipídica</option>
                <option value="calcificada">calcificada</option>
                <option value="mista">mista</option>
              </select>
            </label>
          )}
        </>
      )}

      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={CAMPO_LABEL}>Observação</span>
        <input
          type="text"
          value={selectedVessel.observacao || ""}
          onChange={(e) => onChange(selected, "observacao", e.target.value)}
          placeholder="Anotações livres..."
          style={CAMPO_INPUT}
        />
      </label>
    </div>
  );

  return (
    <>
      <MapaLayout
      embutido={embutido}
        titulo="Mapa Interativo — Carótidas e Vertebrais"
        onFechar={onFechar}
        desenho={desenho}
        legenda={legenda}
        painel={painel}
        tituloPainel={selected ? CAROTIDAS_VESSEL_NAMES[selected] : ""}
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
          <div style={{ width: "100%", maxWidth: 700, margin: "0 auto", aspectRatio: "850 / 820" }} dangerouslySetInnerHTML={{ __html: svgIlustracao }} />
          <div style={{ marginTop: 8 }}><LegendaCarotidas /></div>
        </PreviewImagemPdf>
      )}
    </>
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
