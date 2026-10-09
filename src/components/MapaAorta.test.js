import { pontosDoPath } from "../utils/svgPathBounds";
import { SILHUETA_ABDOME, pontosDosVasosAorta } from "./MapaAorta";

function dentro(poligono, x, y) {
  let c = false;
  for (let i = 0, j = poligono.length - 1; i < poligono.length; j = i++) {
    const [xi, yi] = poligono[i], [xj, yj] = poligono[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}

describe("mapa da aorta: vasos dentro do abdome", () => {
  // pontosDoPath entende M/C: as junções "L" viram "M" (o ponto entra no contorno igual).
  const contorno = pontosDoPath(SILHUETA_ABDOME.replace(/L/g, "M").replace("Z", ""), 20);

  it("aorta e ilíacas (centro e paredes) ficam dentro do contorno", () => {
    const fora = [];
    Object.entries(pontosDosVasosAorta()).forEach(([vaso, amostras]) => {
      amostras.forEach((a) => {
        [[a.x, a.y], [a.x + a.nx * a.hw, a.y + a.ny * a.hw], [a.x - a.nx * a.hw, a.y - a.ny * a.hw]].forEach(([x, y]) => {
          if (!dentro(contorno, x, y)) fora.push(`${vaso} (${x.toFixed(0)},${y.toFixed(0)})`);
        });
      });
    });
    expect(fora).toEqual([]);
  });
});
