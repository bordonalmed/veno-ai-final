import { calcularRecorte, temTransparencia } from "./imagemPerfil";

function imagem(w, h, pinta) {
  const d = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4;
    const [r, g, b, a] = pinta(x, y);
    d[i] = r; d[i + 1] = g; d[i + 2] = b; d[i + 3] = a;
  }
  return d;
}

describe("preparar logo/assinatura", () => {
  it("corta borda transparente", () => {
    const d = imagem(100, 50, (x, y) => (x >= 20 && x < 80 && y >= 10 && y < 40 ? [200, 0, 0, 255] : [0, 0, 0, 0]));
    const r = calcularRecorte(d, 100, 50);
    expect(r.x).toBeLessThanOrEqual(20);
    expect(r.x).toBeGreaterThanOrEqual(17);
    expect(r.w).toBeLessThanOrEqual(66);
    expect(r.h).toBeLessThanOrEqual(36);
    expect(temTransparencia(d)).toBe(true);
  });

  it("corta fundo branco (foto da assinatura no papel)", () => {
    const d = imagem(100, 60, (x, y) => (y >= 25 && y < 35 && x >= 10 && x < 90 ? [20, 20, 60, 255] : [255, 255, 255, 255]));
    const r = calcularRecorte(d, 100, 60);
    expect(r.h).toBeLessThanOrEqual(14);
    expect(temTransparencia(d)).toBe(false);
  });

  it("imagem toda vazia não é cortada", () => {
    const d = imagem(10, 10, () => [0, 0, 0, 0]);
    expect(calcularRecorte(d, 10, 10)).toEqual({ x: 0, y: 0, w: 10, h: 10 });
  });
});
