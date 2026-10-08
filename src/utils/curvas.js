// Vasos como curvas parametrizadas pelo comprimento (t = 0 no início, 1 no
// fim). Diferente do vascularMapping.js (que mede tudo pela altura y e só
// serve para vasos "em pé", como na perna), aqui o vaso pode correr em
// qualquer direção — a subclávia, por exemplo, é quase horizontal.

const PASSOS_POR_SEGMENTO = 16;

function lerp(a, b, f) {
  return a + (b - a) * f;
}

// Amostra uma Catmull-Rom pelos pontos, com a meia-largura interpolada.
export function criarCurva(pts, half) {
  const hw = Array.isArray(half) ? half : pts.map(() => half);
  const p = [pts[0], ...pts, pts[pts.length - 1]];
  const amostras = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const [p0, p1, p2, p3] = [p[i], p[i + 1], p[i + 2], p[i + 3]];
    for (let k = 0; k < PASSOS_POR_SEGMENTO; k++) {
      const u = k / PASSOS_POR_SEGMENTO;
      const u2 = u * u, u3 = u2 * u;
      const coord = (j) => 0.5 * (
        2 * p1[j] + (-p0[j] + p2[j]) * u + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * u2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * u3
      );
      amostras.push({ x: coord(0), y: coord(1), hw: lerp(hw[i], hw[i + 1], u) });
    }
  }
  const ult = pts[pts.length - 1];
  amostras.push({ x: ult[0], y: ult[1], hw: hw[hw.length - 1] });

  let s = 0;
  amostras.forEach((a, i) => {
    if (i > 0) s += Math.hypot(a.x - amostras[i - 1].x, a.y - amostras[i - 1].y);
    a.s = s;
  });
  amostras.forEach((a, i) => {
    const prev = amostras[Math.max(0, i - 1)], next = amostras[Math.min(amostras.length - 1, i + 1)];
    const dx = next.x - prev.x, dy = next.y - prev.y;
    const L = Math.hypot(dx, dy) || 1;
    a.nx = -dy / L; // normal (perpendicular à direção do vaso)
    a.ny = dx / L;
  });
  return { amostras, comprimento: s };
}

export function pontoEm(curva, t) {
  const alvo = Math.max(0, Math.min(1, t)) * curva.comprimento;
  const a = curva.amostras;
  for (let i = 0; i < a.length - 1; i++) {
    if (alvo <= a[i + 1].s) {
      const f = (alvo - a[i].s) / ((a[i + 1].s - a[i].s) || 1);
      return {
        x: lerp(a[i].x, a[i + 1].x, f), y: lerp(a[i].y, a[i + 1].y, f), hw: lerp(a[i].hw, a[i + 1].hw, f),
        nx: lerp(a[i].nx, a[i + 1].nx, f), ny: lerp(a[i].ny, a[i + 1].ny, f),
      };
    }
  }
  return { ...a[a.length - 1] };
}

function trecho(curva, ta, tb) {
  const n = Math.max(2, Math.ceil(((tb - ta) * curva.comprimento) / 2));
  return Array.from({ length: n + 1 }, (_, i) => pontoEm(curva, ta + ((tb - ta) * i) / n));
}

const f2 = (v) => v.toFixed(2);

// Contorno do vaso (faixa com a largura dele) entre ta e tb.
export function fita(curva, ta = 0, tb = 1, escala = 1) {
  const pts = trecho(curva, ta, tb);
  const esq = pts.map((p) => [p.x + p.nx * p.hw * escala, p.y + p.ny * p.hw * escala]);
  const dir = pts.map((p) => [p.x - p.nx * p.hw * escala, p.y - p.ny * p.hw * escala]).reverse();
  return "M " + [...esq, ...dir].map(([x, y]) => `${f2(x)},${f2(y)}`).join(" L ") + " Z";
}

// Linha central entre ta e tb.
export function linha(curva, ta = 0, tb = 1, deslocamento = 0) {
  const pts = trecho(curva, ta, tb);
  return "M " + pts.map((p) => `${f2(p.x + p.nx * deslocamento)},${f2(p.y + p.ny * deslocamento)}`).join(" L ");
}

// Terços do vaso (proximal = início da curva).
export function faixaDoTerco(terco) {
  if (terco === "Terço proximal") return [0, 1 / 3];
  if (terco === "Terço médio") return [1 / 3, 2 / 3];
  if (terco === "Terço distal") return [2 / 3, 1];
  return [0, 1];
}
