// Geometria do Esquema de Mapeamento 3D (perna única, rotacionável).
// Reaproveita apenas os pontos de referência e a função de campo->posição do
// modelo 2D (vascularMapping.js) para garantir que os dois desenhos sempre
// concordem sobre onde cada segmento começa/termina. Não importa nada do
// three.js aqui — mantém este módulo puro e testável isoladamente.

import { yFromField, CORES } from "./vascularMapping";

// Escala px (mesmo domínio do modelo 2D: 48 = JSF, 552 = tornozelo) -> unidades 3D.
const SCALE = 1 / 100;
export function pxToY(px) {
  return (552 - px) * SCALE; // tornozelo = 0, sobe a partir dali
}

// Perfil de raio da perna (silhueta), da coxa (px baixo) ao pé (px alto),
// no mesmo domínio de px do modelo 2D. Valores aproximados, só para dar
// volume à perna — não é anatomia escaneada.
const RADIUS_PROFILE = [
  [20, 0.92],
  [48, 1.0],
  [150, 1.05],
  [260, 0.88],
  [320, 0.6],
  [360, 0.7],
  [430, 0.8],
  [500, 0.55],
  [552, 0.36],
  [572, 0.3],
  [610, 0.14],
];

export function legRadiusAtPx(px) {
  const p = Math.max(RADIUS_PROFILE[0][0], Math.min(RADIUS_PROFILE[RADIUS_PROFILE.length - 1][0], px));
  for (let i = 0; i < RADIUS_PROFILE.length - 1; i++) {
    const [pxA, rA] = RADIUS_PROFILE[i];
    const [pxB, rB] = RADIUS_PROFILE[i + 1];
    if (p >= pxA && p <= pxB) {
      const t = (p - pxA) / (pxB - pxA);
      return rA + (rB - rA) * t;
    }
  }
  return RADIUS_PROFILE[RADIUS_PROFILE.length - 1][1];
}

export const LEG_PX_RANGE = [RADIUS_PROFILE[0][0], RADIUS_PROFILE[RADIUS_PROFILE.length - 1][0]];

function deg(d) {
  return (d * Math.PI) / 180;
}

// Posicionamento anatômico aproximado (ângulo ao redor do eixo da perna).
// 0° = lateral, 90° = anterior, 180° = medial, 270° = posterior.
export const VEIN_ANGLE = {
  magna: deg(200), // medial, levemente anterior
  parva: deg(280), // posterior
  femoral: deg(130), // anteromedial da coxa, profunda — afastada da magna
  calf: deg(320), // posterolateral da perna, profunda — afastada da parva
};

export const VEIN_DEPTH = {
  magna: 0.97,
  parva: 0.95,
  femoral: 0.38,
  calf: 0.42,
};

// Retorna uma lista de pontos [x,y,z] (array simples, sem depender de THREE)
// ao longo do trajeto de uma veia entre dois px do domínio 2D.
export function buildVeinCurvePoints(pxA, pxB, theta, depthFrac, steps = 14) {
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const px = pxA + (pxB - pxA) * (i / steps);
    const y = pxToY(px);
    const r = legRadiusAtPx(px) * depthFrac;
    pts.push([Math.cos(theta) * r, y, Math.sin(theta) * r]);
  }
  return pts;
}

export function pontoNaPerna(px, theta, depthFrac) {
  const y = pxToY(px);
  const r = legRadiusAtPx(px) * depthFrac;
  return [Math.cos(theta) * r, y, Math.sin(theta) * r];
}

// Espelha a árvore de decisão de construirSegmentosVeia() (vascularMapping.js),
// mas devolve faixas de px (yA/yB) em vez de um path SVG — o que o desenho 3D
// precisa para recortar o tubo da veia em trechos coloridos.
export function segmentosPorPx({ landmark, status, ini, fim, iniVal, fimVal }) {
  if (status === "ausente") {
    return [{ pxA: landmark.top, pxB: landmark.tornozelo, color: CORES.ausente, tracejado: true }];
  }
  if (status !== "pérvia e incompetente") {
    const cor = CORES[status] || CORES.ausente;
    return [{ pxA: landmark.top, pxB: landmark.tornozelo, color: cor }];
  }
  const needIni = ini && ini.indexOf("cm_") === 0;
  const needFim = fim && fim.indexOf("cm_") === 0;
  const completo = ini && fim && (!needIni || iniVal) && (!needFim || fimVal);
  if (!completo) {
    return [{ pxA: landmark.top, pxB: landmark.tornozelo, color: CORES["pérvia e incompetente"] }];
  }
  let pxStart = yFromField(ini, iniVal, landmark);
  let pxEnd = yFromField(fim, fimVal, landmark);
  if (pxStart > pxEnd) {
    const t = pxStart;
    pxStart = pxEnd;
    pxEnd = t;
  }
  const segs = [];
  if (pxStart > landmark.top + 2) {
    segs.push({ pxA: landmark.top, pxB: pxStart, color: CORES["pérvia e competente"] });
  }
  segs.push({ pxA: pxStart, pxB: pxEnd, color: CORES["pérvia e incompetente"] });
  if (pxEnd < landmark.tornozelo - 2) {
    segs.push({ pxA: pxEnd, pxB: landmark.tornozelo, color: CORES["pérvia e competente"] });
  }
  return segs;
}
