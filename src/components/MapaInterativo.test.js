// Testes de regressão geométrica dos ícones de variz do Mapa Interativo.
//
// Os 4 pontos (coxa/perna/tornozelo/pé) ficam numa faixa estreita entre o
// contorno da perna e a Safena Magna (coxa/perna) ou perto do tornozelo —
// já tivemos o ícone (então um círculo simples) vazando ligeiramente da
// perna ali. Esses testes conferem a elipse inteira (32 pontos ao redor,
// nos dois tamanhos possíveis — vazio e com tipo marcado) contra o
// contorno real e, na coxa/perna, também contra a Safena Magna.
import {
  MEDIAL_SILHOUETTE,
  POSTERIOR_SILHOUETTE,
  VSM_SPINE,
  VSM_HALF,
  interpAt,
} from "../utils/vascularMapping";
import { pontosDoPath, pontoDentroDaFaixa, faixaXNaAltura } from "../utils/svgPathBounds";
import { VARIZ_SPOTS, VARIZ_ICON_RX, VARIZ_ICON_RY_VAZIO, VARIZ_ICON_RY_TIPO } from "./MapaInterativo";

const silhuetaMedial = pontosDoPath(MEDIAL_SILHOUETTE);
const silhuetaPosterior = pontosDoPath(POSTERIOR_SILHOUETTE);

function pontosDaElipse(cx, cy, rx, ry, amostras = 32) {
  const pontos = [];
  for (let i = 0; i < amostras; i++) {
    const ang = (i / amostras) * 2 * Math.PI;
    pontos.push([cx + rx * Math.cos(ang), cy + ry * Math.sin(ang)]);
  }
  return pontos;
}

// Só coxa/perna (vista medial) ficam espremidos contra a Safena Magna — o
// tornozelo/pé (vista posterior) não têm essa veia por perto naquela altura.
function ladoEsquerdoDaVeia(y) {
  const [x, , half] = interpAt(VSM_SPINE, VSM_HALF, y);
  return x - half;
}

describe("VARIZ_SPOTS — 4 regiões definidas (coxa/perna/tornozelo/pé)", () => {
  it("cada região tem uma posição e uma vista associada", () => {
    const regioes = VARIZ_SPOTS.map((s) => s.regiao).sort();
    expect(regioes).toEqual(["coxa", "pe", "perna", "tornozelo"]);
    VARIZ_SPOTS.forEach((spot) => {
      expect(["medial", "posterior"]).toContain(spot.view);
    });
  });
});

describe("Ícones de variz — a elipse inteira fica dentro do desenho da perna", () => {
  VARIZ_SPOTS.forEach((spot) => {
    const silhueta = spot.view === "medial" ? silhuetaMedial : silhuetaPosterior;

    it(`${spot.regiao} (estado vazio, sem tipo marcado)`, () => {
      const pontos = pontosDaElipse(spot.x, spot.y, VARIZ_ICON_RX, VARIZ_ICON_RY_VAZIO);
      pontos.forEach(([x, y]) => {
        expect(pontoDentroDaFaixa(silhueta, x, y)).toBe(true);
      });
    });

    it(`${spot.regiao} (com tipo marcado — elipse maior)`, () => {
      const pontos = pontosDaElipse(spot.x, spot.y, VARIZ_ICON_RX, VARIZ_ICON_RY_TIPO);
      pontos.forEach(([x, y]) => {
        expect(pontoDentroDaFaixa(silhueta, x, y)).toBe(true);
      });
    });

    if (spot.view === "medial") {
      it(`${spot.regiao} não invade a Safena Magna (maior elipse, lado direito do ícone)`, () => {
        const pontos = pontosDaElipse(spot.x, spot.y, VARIZ_ICON_RX, VARIZ_ICON_RY_TIPO);
        pontos.forEach(([x, y]) => {
          const limiteVeia = ladoEsquerdoDaVeia(y);
          expect(x).toBeLessThan(limiteVeia);
        });
      });
    }
  });
});

describe("VARIZ_SPOTS — sanidade das posições (documentação viva)", () => {
  it("cada spot realmente existe dentro da silhueta na sua altura (não é um ponto perdido fora do desenho)", () => {
    VARIZ_SPOTS.forEach((spot) => {
      const silhueta = spot.view === "medial" ? silhuetaMedial : silhuetaPosterior;
      expect(faixaXNaAltura(silhueta, spot.y)).not.toBeNull();
    });
  });
});
