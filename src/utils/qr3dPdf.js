// QR Code do exame em 3D no rodapé do laudo (canto esquerdo, livre: a
// assinatura fica à direita). Pequeno, só com "Aponte o celular e veja o
// exame em 3D". Um por membro: cada membro tem sua página de laudo.
import QRCode from "qrcode";
import { linkExame3D, qr3dLigado } from "./codigo3d";
import { normalizarVarizesLado } from "./mmiiVenosoLaudo";

export const QR_LADO_MM = 15;
export const QR_TOPO_MM = 272; // abaixo do texto (que vai até 265-270) e acima da marca (292)
const TEXTO = ["Aponte o celular e", "veja o exame em 3D"];

export const ehMMIIVenoso = (exame) => /venoso de membros inferiores|^mmii venoso$/i.test(String(exame?.tipoNome || ""))
  && !!exame?.superficiais;

// { Direito: pngDataUrl, Esquerdo: pngDataUrl } dos membros examinados
export async function qrsDoExame3D({ lado, profundas, superficiais, magna, parva, perfurantes, varizes }, { forcar = false } = {}) {
  if (!forcar && !qr3dLigado()) return {};
  const lados = lado === "Ambos" ? ["Direito", "Esquerdo"] : lado ? [lado] : [];
  const out = {};
  for (const l of lados) {
    try {
      const link = linkExame3D({
        lado: l, profundas: profundas?.[l], superficiais: superficiais?.[l], magna: magna?.[l], parva: parva?.[l],
        perfurantes: perfurantes?.[l], varizes: normalizarVarizesLado(varizes?.[l]),
      });
      out[l] = await QRCode.toDataURL(link, { errorCorrectionLevel: "M", margin: 1, width: 360 });
    } catch (_) { /* sem QR: o laudo sai normal */ }
  }
  return out;
}

// jsPDF (mm)
export function desenharQr3dRodape(doc, png) {
  if (!png) return;
  doc.addImage(png, "PNG", 15, QR_TOPO_MM, QR_LADO_MM, QR_LADO_MM);
  doc.setFontSize(7.5);
  doc.setFont(undefined, "bold");
  doc.setTextColor(40, 50, 60);
  TEXTO.forEach((t, i) => doc.text(t, 15 + QR_LADO_MM + 2.5, QR_TOPO_MM + 6.5 + i * 3.6));
  doc.setFont(undefined, "normal");
  doc.setTextColor(0, 0, 0);
}

// pdf-lib (pontos; y a partir de baixo)
export async function desenharQr3dRodapePdfLib(pdf, pagina, png, fonte, rgb) {
  if (!png) return;
  const MM = 72 / 25.4, altura = pagina.getHeight();
  const bytes = Uint8Array.from(atob(png.split(",")[1] || ""), (c) => c.charCodeAt(0));
  const img = await pdf.embedPng(bytes);
  const lado = QR_LADO_MM * MM, x = 15 * MM, yBase = altura - (QR_TOPO_MM + QR_LADO_MM) * MM;
  pagina.drawImage(img, { x, y: yBase, width: lado, height: lado });
  TEXTO.forEach((t, i) => pagina.drawText(t, { x: x + lado + 2.5 * MM, y: altura - (QR_TOPO_MM + 6.5 + i * 3.6) * MM, size: 7.5, font: fonte, color: rgb(0.16, 0.2, 0.24) }));
}
