import { pontosDoPath } from "../utils/svgPathBounds";
import { SILHUETA_BRACO, pontosDosVasos } from "./MapaMMSS";

// Ponto dentro do polígono (ray casting), com o contorno amostrado do path.
function dentro(poligono, x, y) {
  let c = false;
  for (let i = 0, j = poligono.length - 1; i < poligono.length; j = i++) {
    const [xi, yi] = poligono[i], [xj, yj] = poligono[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}

describe("mapa do braço: vasos dentro do contorno", () => {
  // pontosDoPath só entende M/C/Z: tira o "L 300,0" do fim e fecha à mão.
  const contorno = [...pontosDoPath(SILHUETA_BRACO.replace(" L 300,0 Z", ""), 20), [300, 0]];

  it("todas as artérias e veias (centro e paredes) ficam dentro do braço", () => {
    const fora = [];
    Object.entries(pontosDosVasos()).forEach(([vaso, amostras]) => {
      amostras.forEach((a) => {
        [[a.x, a.y], [a.x + a.nx * a.hw, a.y + a.ny * a.hw], [a.x - a.nx * a.hw, a.y - a.ny * a.hw]].forEach(([x, y]) => {
          // y=0 é a borda de cima do quadro (pescoço cortado): ignora o primeiro pixel
          if (y > 1 && !dentro(contorno, x, y)) fora.push(`${vaso} (${x.toFixed(0)},${y.toFixed(0)})`);
        });
      });
    });
    expect(fora).toEqual([]);
  });
});
