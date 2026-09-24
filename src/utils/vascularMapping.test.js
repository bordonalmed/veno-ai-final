// Testes de regressão geométrica do Mapa Interativo / Mapeamento Visual.
//
// Já tivemos elementos escapando do desenho da perna (veias da panturrilha,
// marcador de perfurante perto do joelho, ícones de variz) porque o espaço
// livre varia bastante conforme a altura — o que cabe no topo da coxa não
// cabe perto do joelho. Esses testes reproduzem o método usado pra corrigir
// cada um desses bugs (amostrar o contorno real e conferir contra ele) pra
// pegar automaticamente qualquer regressão futura nas coordenadas.
import {
  MEDIAL_SILHOUETTE,
  VSM_SPINE,
  VSM_HALF,
  posicaoPerfurante,
  trianguloPontos,
  PERFURANTE_TRIANGULO_RAIO,
} from "./vascularMapping";
import { pontosDoPath, pontoDentroDaFaixa } from "./svgPathBounds";

const silhuetaMedial = pontosDoPath(MEDIAL_SILHOUETTE);

// Mesmos 3 campos de segmento que aparecem no formulário/mapa, cobrindo do
// topo da coxa (JSF) ao tornozelo — "cm acima do joelho" com valor 0 é
// exatamente o cenário do bug original (cai bem no ponto mais estreito).
const segmentosPerfurante = [
  { label: "cm acima do joelho", valores: ["0", "", "10", "20"] },
  { label: "cm abaixo do joelho", valores: ["0", "5", "15"] },
  { label: "cm acima do tornozelo", valores: ["0", "5", "20"] },
];

describe("posicaoPerfurante — marcador nunca sai do desenho da perna", () => {
  segmentosPerfurante.forEach(({ label, valores }) => {
    valores.forEach((valor) => {
      it(`"${label}" com valor "${valor || '(vazio)'}" fica dentro da silhueta`, () => {
        const pos = posicaoPerfurante(label, valor);
        expect(pos).not.toBeNull();
        const pontos = trianguloPontos(pos.x, pos.y, PERFURANTE_TRIANGULO_RAIO)
          .split(" ")
          .map((par) => par.split(",").map(Number));
        expect(pontos).toHaveLength(3);
        pontos.forEach(([x, y]) => {
          expect(pontoDentroDaFaixa(silhuetaMedial, x, y)).toBe(true);
        });
      });
    });
  });

  it("empilhamento vertical de múltiplos perfurantes (idx * 12) continua seguro", () => {
    // Mesma lógica de empilhamento usada em MapaInterativo.js/EsquemaMapeamentoModal.js
    // quando há mais de um perfurante na mesma altura.
    const pos = posicaoPerfurante("cm acima do joelho", "0"); // pior caso: no joelho
    for (let idx = 0; idx < 4; idx++) {
      const y = pos.y + idx * 12;
      const pontos = trianguloPontos(pos.x, y, PERFURANTE_TRIANGULO_RAIO)
        .split(" ")
        .map((par) => par.split(",").map(Number));
      pontos.forEach(([x, py]) => {
        expect(pontoDentroDaFaixa(silhuetaMedial, x, py)).toBe(true);
      });
    }
  });
});

describe("trianguloPontos", () => {
  it("retorna 3 vértices distintos formando um triângulo (não degenerado)", () => {
    const pontos = trianguloPontos(100, 200, 6.5)
      .split(" ")
      .map((par) => par.split(",").map(Number));
    expect(pontos).toHaveLength(3);
    const [a, b, c] = pontos;
    // área do triângulo pela fórmula do determinante — zero só se os 3
    // pontos fossem colineares (o que indicaria um bug na geometria)
    const area = Math.abs((b[0] - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (b[1] - a[1])) / 2;
    expect(area).toBeGreaterThan(1);
  });
});

describe("VSM_SPINE/VSM_HALF — trecho da Safena Magna cabe na silhueta medial", () => {
  it("as duas bordas do traçado (spine ± half) ficam dentro do contorno em cada ponto definido", () => {
    VSM_SPINE.forEach(([x, y], i) => {
      const half = VSM_HALF[i];
      expect(pontoDentroDaFaixa(silhuetaMedial, x - half, y)).toBe(true);
      expect(pontoDentroDaFaixa(silhuetaMedial, x + half, y)).toBe(true);
    });
  });
});
