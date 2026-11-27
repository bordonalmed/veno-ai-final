/**
 * @jest-environment node
 */
import { PDFDocument, StandardFonts, rgb, PDFName } from "pdf-lib";
import jsPDF from "jspdf";
import { desenharQr3dRodapePdfLib, desenharQr3dRodape, desenharQr3dNasPaginasDoMapa } from "./qr3dPdf";

// PNG 1x1
const PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
const LINK = "https://venoai.xyz/3d#AbC";

describe("QR Code do exame em 3D no PDF", () => {
  it("pdf-lib (exame salvo): desenha o QR e cria 2 links clicáveis (botão e QR)", async () => {
    const pdf = await PDFDocument.create();
    const pagina = pdf.addPage([595, 842]);
    const fonte = await pdf.embedFont(StandardFonts.HelveticaBold);
    await desenharQr3dRodapePdfLib(pdf, pagina, { png: PNG, link: LINK }, fonte, rgb);
    const anots = pagina.node.lookup(PDFName.of("Annots"));
    expect(anots.size()).toBe(2);
  });

  it("jsPDF: botão com link no laudo e nas páginas do mapa (o último bloco, uma por membro)", () => {
    const doc = new jsPDF();
    doc.addPage(); doc.addPage(); doc.addPage(); // 4 páginas: 2 de laudo + 2 de mapa
    desenharQr3dNasPaginasDoMapa(doc, ["Direito", "Esquerdo"], { Direito: { png: PNG, link: LINK + "D" }, Esquerdo: { png: PNG, link: LINK + "E" } });
    const saida = doc.output();
    expect((saida.match(/\/URI \(https:\/\/venoai\.xyz\/3d#AbCD\)/g) || []).length).toBe(2);
    expect((saida.match(/\/URI \(https:\/\/venoai\.xyz\/3d#AbCE\)/g) || []).length).toBe(2);
  });

  it("aceita o formato antigo (só a imagem) sem quebrar", () => {
    const doc = new jsPDF();
    expect(() => desenharQr3dRodape(doc, PNG)).not.toThrow();
  });
});
