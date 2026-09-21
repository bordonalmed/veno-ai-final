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

// Perfil ANATÔMICO da perna: em vez de um raio único (que dava um "cone"
// perfeitamente circular), a silhueta agora tem largura (medial-lateral,
// eixo X) e profundidade (anterior-posterior, eixo Z) independentes, mais
// alguns relevos locais (batata da perna, joelho, canela, maléolos, calcanhar)
// — o suficiente pra ler como uma perna de verdade sem depender de nenhum
// banco de modelos externo. Ainda é esquemático, não é anatomia escaneada.
function interpolar(tabela, px) {
  const p = Math.max(tabela[0][0], Math.min(tabela[tabela.length - 1][0], px));
  for (let i = 0; i < tabela.length - 1; i++) {
    const [pxA, vA] = tabela[i];
    const [pxB, vB] = tabela[i + 1];
    if (p >= pxA && p <= pxB) {
      const t = (p - pxA) / (pxB - pxA);
      return vA + (vB - vA) * t;
    }
  }
  return tabela[tabela.length - 1][1];
}

// Largura medial-lateral (eixo X) por px.
const RX_PROFILE = [
  [20, 0.86],
  [48, 0.97],
  [150, 1.0],
  [260, 0.8],
  [320, 0.48],
  [360, 0.5],
  [430, 0.5],
  [480, 0.42],
  [530, 0.3],
  [552, 0.27],
  [572, 0.3],
  [610, 0.15],
];
// Profundidade anterior-posterior (eixo Z) por px — mais funda que larga na
// batata da perna (barriga da gastrocnêmio) e no pé (que aponta pra frente).
const RZ_PROFILE = [
  [20, 0.8],
  [48, 0.92],
  [150, 0.95],
  [260, 0.76],
  [320, 0.46],
  [360, 0.6],
  [430, 0.76],
  [480, 0.56],
  [530, 0.34],
  [552, 0.25],
  [572, 0.42],
  [610, 0.34],
];

export const LEG_PX_RANGE = [RX_PROFILE[0][0], RX_PROFILE[RX_PROFILE.length - 1][0]];

function deg(d) {
  return (d * Math.PI) / 180;
}

function anguloMaisProximo(thetaDeg, centroDeg) {
  let diff = Math.abs(thetaDeg - centroDeg) % 360;
  if (diff > 180) diff = 360 - diff;
  return diff;
}

// Relevo local: um "calombo" (ou depressão, se amount < 0) centrado num
// ângulo e numa altura (px), com queda suave (gaussiana) nas duas direções.
function relevo(px, thetaDeg, centroDeg, larguraAngular, pxCentro, larguraPx, amount) {
  const dAng = anguloMaisProximo(thetaDeg, centroDeg) / larguraAngular;
  const dPx = (px - pxCentro) / larguraPx;
  return amount * Math.exp(-(dAng * dAng) - (dPx * dPx));
}

const RELEVOS = [
  // batata da perna (gastrocnêmio): bojo posterior na panturrilha
  { centroDeg: 270, larguraAngular: 55, pxCentro: 395, larguraPx: 55, amount: 0.16 },
  // patela: pequeno bojo anterior bem no joelho
  { centroDeg: 90, larguraAngular: 30, pxCentro: 322, larguraPx: 16, amount: 0.1 },
  // crista da tíbia: aresta fina e sutil descendo pela canela
  { centroDeg: 90, larguraAngular: 10, pxCentro: 460, larguraPx: 90, amount: 0.05 },
  // maléolo medial (lado da safena magna) e lateral, perto do tornozelo
  { centroDeg: 200, larguraAngular: 22, pxCentro: 542, larguraPx: 13, amount: 0.09 },
  { centroDeg: 340, larguraAngular: 22, pxCentro: 542, larguraPx: 13, amount: 0.07 },
  // calcanhar: bojo posterior no pé
  { centroDeg: 270, larguraAngular: 40, pxCentro: 578, larguraPx: 16, amount: 0.11 },
];

// Elipse "base" (sem os relevos), lisa — é o que as veias seguem por baixo
// da pele. Uma veia de verdade não faz zigue-zague contornando o osso do
// tornozelo; quem tem esse relevo é só a pele.
export function legEllipseXZ(px, thetaDeg) {
  const rx = interpolar(RX_PROFILE, px);
  const rz = interpolar(RZ_PROFILE, px);
  const theta = deg(thetaDeg);
  return [rx * Math.cos(theta), rz * Math.sin(theta)];
}

// Ponto (x,z) da silhueta da PELE numa altura (px) e ângulo (graus) dados —
// elipse base + relevos locais (batata da perna, joelho, maléolos, calcanhar).
export function legCrossSectionXZ(px, thetaDeg) {
  const [x0, z0] = legEllipseXZ(px, thetaDeg);
  const theta = deg(thetaDeg);
  let extra = 0;
  for (const r of RELEVOS) {
    extra += relevo(px, thetaDeg, r.centroDeg, r.larguraAngular, r.pxCentro, r.larguraPx, r.amount);
  }
  return [x0 + extra * Math.cos(theta), z0 + extra * Math.sin(theta)];
}

// Raio médio numa altura (usado só para posicionar as veias "por dentro" da
// perna, não para desenhar a silhueta em si).
export function legRadiusAtPx(px) {
  return (interpolar(RX_PROFILE, px) + interpolar(RZ_PROFILE, px)) / 2;
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

// Segue a silhueta anatômica de verdade (legCrossSectionXZ) em vez de um raio
// fixo, escalado por depthFrac — assim as veias superficiais (safenas) ficam
// coladas no contorno real da perna (inclusive nos relevos, tipo o maléolo),
// e as profundas ficam visivelmente "por dentro".
export function buildVeinCurvePoints(pxA, pxB, theta, depthFrac, steps = 14) {
  const thetaDeg = (theta * 180) / Math.PI;
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const px = pxA + (pxB - pxA) * (i / steps);
    const y = pxToY(px);
    const [x, z] = legEllipseXZ(px, thetaDeg);
    pts.push([x * depthFrac, y, z * depthFrac]);
  }
  return pts;
}

export function pontoNaPerna(px, theta, depthFrac) {
  const y = pxToY(px);
  const [x, z] = legEllipseXZ(px, (theta * 180) / Math.PI);
  return [x * depthFrac, y, z * depthFrac];
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
