/**
 * @jest-environment node
 */
import jsPDF from "jspdf";
import { tamanhoProporcional, desenharImagemProporcional, desenharCabecalhoLaudo } from "./pdfCabecalho";

const LARGO = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACgAAAAKCAIAAABJ+IsHAAAAGklEQVR4nGM8wTAwgGmA7B21eNTiUYuHgcUA5LMA3NHto10AAAAASUVORK5CYII=";
const ALTO = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAoCAIAAABINPzXAAAAGklEQVR4nGM8wYAPMOGVHZUelR6VHpUehNIAjswBGJyb5SQAAAAASUVORK5CYII=";

describe("logo e assinatura proporcionais no PDF", () => {
  it("cabe na caixa sem distorcer", () => {
    expect(tamanhoProporcional(400, 100, 50, 20)).toEqual({ w: 50, h: 12.5 });
    expect(tamanhoProporcional(100, 400, 50, 20)).toEqual({ w: 5, h: 20 });
  });

  it("logo horizontal e vertical mantêm a proporção (antes saíam 20x20)", () => {
    const doc = new jsPDF();
    const espiao = jest.spyOn(doc, "addImage");
    desenharImagemProporcional(doc, LARGO, { x: 15, y: 14, maxW: 50, maxH: 20 });
    desenharImagemProporcional(doc, ALTO, { x: 15, y: 14, maxW: 50, maxH: 20 });
    const [a, b] = espiao.mock.calls;
    expect(a[4] / a[5]).toBeCloseTo(4);
    expect(b[4] / b[5]).toBeCloseTo(0.25);
    expect(b[5]).toBeCloseTo(20);
  });

  it("imagem inválida não quebra o PDF", () => {
    const doc = new jsPDF();
    expect(desenharImagemProporcional(doc, "data:image/png;base64,xxxx", { x: 0, y: 0, maxW: 10, maxH: 10 })).toBeNull();
  });

  it("cabeçalho: sem nada começa em 20; com logo deixa espaço; texto longo quebra sem invadir o logo", () => {
    expect(desenharCabecalhoLaudo(new jsPDF(), { logo: null, linhas: [] })).toBe(20);
    const doc = new jsPDF();
    const espiao = jest.spyOn(doc, "text");
    const y = desenharCabecalhoLaudo(doc, {
      logo: LARGO,
      linhas: ["Clínica", "Avenida Voluntários da Pátria, 700, Edifício Zenith, sala 1203, Centro, Londrina - PR, CEP 86010-000", "Tel: (43) 99999-9999"],
    });
    expect(y).toBeGreaterThanOrEqual(14 + 12.5 + 8);
    // cada linha cabe entre o logo (15 + 50 + 8) e a margem direita (200)
    doc.setFontSize(9);
    doc.setFont(undefined, "bold");
    espiao.mock.calls.forEach(([t]) => expect(doc.getTextWidth(t)).toBeLessThanOrEqual(200 - 73 + 0.01));
    expect(espiao.mock.calls.length).toBeGreaterThan(3);
  });
});
