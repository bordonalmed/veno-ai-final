import { POSTERIOR_SILHOUETTE } from "../utils/vascularMapping";
import { pontosDoPath, pontoDentroDaFaixa } from "../utils/svgPathBounds";
import { ARTERIAS } from "../utils/mmiiArterialLaudo";
import { GEOMETRIA_ARTERIAS } from "./MapaInterativoArterial";

const silhueta = pontosDoPath(POSTERIOR_SILHOUETTE);

describe("Mapa arterial — geometria", () => {
  it("toda artéria do laudo tem desenho", () => {
    ARTERIAS.forEach((nome) => expect(GEOMETRIA_ARTERIAS[nome]).toBeDefined());
  });

  ARTERIAS.forEach((nome) => {
    it(`${nome} cabe dentro do contorno da perna`, () => {
      const { spine, half } = GEOMETRIA_ARTERIAS[nome];
      spine.forEach(([x, y], i) => {
        expect(pontoDentroDaFaixa(silhueta, x - half[i], y, 1)).toBe(true);
        expect(pontoDentroDaFaixa(silhueta, x + half[i], y, 1)).toBe(true);
      });
    });
  });
});
