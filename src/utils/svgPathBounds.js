// Amostra um path SVG simples (M/C/Z, sem curvas quadráticas nem arcos —
// suficiente para as silhuetas do Mapa Interativo) em muitos pontos, pra dar
// pra checar se um marcador/ícone fica dentro do contorno numa dada altura
// (y) sem precisar de um DOM real (Jest roda em Node, sem SVGGeometryElement/
// isPointInFill). Usado pelos testes de regressão geométrica.
export function pontosDoPath(d, passos = 300) {
  const tokens = d.match(/[MCZ]|-?\d+\.?\d*/g) || [];
  let i = 0;
  let atual = null;
  const pontos = [];

  function cubica(p0, p1, p2, p3) {
    for (let t = 0; t <= passos; t++) {
      const tt = t / passos;
      const mt = 1 - tt;
      const x = mt * mt * mt * p0[0] + 3 * mt * mt * tt * p1[0] + 3 * mt * tt * tt * p2[0] + tt * tt * tt * p3[0];
      const y = mt * mt * mt * p0[1] + 3 * mt * mt * tt * p1[1] + 3 * mt * tt * tt * p2[1] + tt * tt * tt * p3[1];
      pontos.push([x, y]);
    }
  }

  while (i < tokens.length) {
    const tok = tokens[i];
    if (tok === "M") {
      atual = [parseFloat(tokens[i + 1]), parseFloat(tokens[i + 2])];
      pontos.push(atual);
      i += 3;
    } else if (tok === "C") {
      const p1 = [parseFloat(tokens[i + 1]), parseFloat(tokens[i + 2])];
      const p2 = [parseFloat(tokens[i + 3]), parseFloat(tokens[i + 4])];
      const p3 = [parseFloat(tokens[i + 5]), parseFloat(tokens[i + 6])];
      cubica(atual, p1, p2, p3);
      atual = p3;
      i += 7;
    } else if (tok === "Z") {
      i += 1;
    } else {
      i += 1;
    }
  }
  return pontos;
}

// Faixa [minX, maxX] da silhueta na altura y (com tolerância), a partir dos
// pontos já amostrados. Retorna null se nenhum ponto amostrado cair perto
// dessa altura (silhueta não chega até ali).
export function faixaXNaAltura(pontos, y, tolerancia = 2) {
  const xs = pontos.filter((p) => Math.abs(p[1] - y) < tolerancia).map((p) => p[0]);
  if (xs.length === 0) return null;
  return [Math.min(...xs), Math.max(...xs)];
}

// Confere se um ponto (x, y) fica dentro da faixa [minX, maxX] da silhueta
// naquela altura, com uma margem de segurança mínima das duas bordas.
export function pontoDentroDaFaixa(pontos, x, y, margem = 0) {
  const faixa = faixaXNaAltura(pontos, y);
  if (!faixa) return false;
  return x >= faixa[0] + margem && x <= faixa[1] - margem;
}
