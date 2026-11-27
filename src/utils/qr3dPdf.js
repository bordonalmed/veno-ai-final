// QR Code do exame em 3D no rodapé do laudo (canto esquerdo, livre: a
// assinatura fica à direita). Pequeno, só com "Aponte o celular e veja o
// exame em 3D". Um por membro: cada membro tem sua página de laudo.
import QRCode from "qrcode";
import { PDFString } from "pdf-lib";
import { linkExame3D, qr3dLigado } from "./codigo3d";
import { normalizarVarizesLado } from "./mmiiVenosoLaudo";

export const QR_LADO_MM = 15;
export const QR_TOPO_MM = 272; // abaixo do texto (que vai até 265-270) e acima da marca (292)
// convite ao paciente: desperta a curiosidade e diz o que fazer (câmera no papel, toque no PDF)
const TITULO = "Seu exame ganhou vida em 3D";
const linhasConvite = (vasos) => ["Aponte a câmera ou toque no QR Code e", `navegue por dentro das suas ${vasos || "veias"}.`];
const BOTAO = "Ver meu exame em 3D";
// botão (mm): ao lado do QR, embaixo do texto; no PDF enviado o paciente toca nele (e no QR)
const BOTAO_X = 15 + QR_LADO_MM + 2.5, BOTAO_Y = QR_TOPO_MM + 9.9, BOTAO_W = 34, BOTAO_H = 5.1;
const qrDe = (q) => (!q ? null : typeof q === "string" ? { png: q, link: "" } : q);

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
      out[l] = { png: await QRCode.toDataURL(link, { errorCorrectionLevel: "M", margin: 1, width: 360 }), link, vasos: "veias" };
    } catch (_) { /* sem QR: o laudo sai normal */ }
  }
  return out;
}

// Doppler arterial: { Direito: png, Esquerdo: png } a partir de arterias = { Direito: {...}, Esquerdo: {...} }
export async function qrsDoExameArterial3D({ lado, arterias, enxertos }, { forcar = false } = {}) {
  if (!forcar && !qr3dLigado()) return {};
  const lados = lado === "Ambos" ? ["Direito", "Esquerdo"] : lado ? [lado] : [];
  const out = {};
  for (const l of lados) {
    try {
      const link = linkExame3D({ modo: "arterial", lado: l, arterias: arterias?.[l] || {}, enxerto: enxertos?.[l] || null });
      out[l] = { png: await QRCode.toDataURL(link, { errorCorrectionLevel: "M", margin: 1, width: 360 }), link, vasos: "artérias" };
    } catch (_) { /* sem QR: o laudo sai normal */ }
  }
  return out;
}

// Doppler venoso de MMSS: { Direito: png, Esquerdo: png }
export async function qrsDoExameMMSS3D({ lado, veias, extras }, { forcar = false } = {}) {
  if (!forcar && !qr3dLigado()) return {};
  const lados = lado === "Ambos" ? ["Direito", "Esquerdo"] : lado ? [lado] : [];
  const out = {};
  for (const l of lados) {
    try {
      const link = linkExame3D({ modo: "mmssVenoso", lado: l, veias: veias?.[l] || {}, extra: extras?.[l] || null });
      out[l] = { png: await QRCode.toDataURL(link, { errorCorrectionLevel: "M", margin: 1, width: 360 }), link, vasos: "veias" };
    } catch (_) { /* sem QR: o laudo sai normal */ }
  }
  return out;
}

// Doppler arterial de MMSS: { Direito: png, Esquerdo: png }
export async function qrsDoExameMMSSArterial3D({ lado, arterias }, { forcar = false } = {}) {
  if (!forcar && !qr3dLigado()) return {};
  const lados = lado === "Ambos" ? ["Direito", "Esquerdo"] : lado ? [lado] : [];
  const out = {};
  for (const l of lados) {
    try {
      const link = linkExame3D({ modo: "mmssArterial", lado: l, arterias: arterias?.[l] || {} });
      out[l] = { png: await QRCode.toDataURL(link, { errorCorrectionLevel: "M", margin: 1, width: 360 }), link, vasos: "artérias" };
    } catch (_) { /* sem QR: o laudo sai normal */ }
  }
  return out;
}
export const ehMMSSArterial = (exame) => /arterial de membros superiores|^mmss arterial$/i.test(String(exame?.tipoNome || "")) && !!(exame?.arteriasDireito || exame?.arteriasEsquerdo);

export const ehMMSSVenoso = (exame) => /venoso de membros superiores|^mmss venoso$/i.test(String(exame?.tipoNome || "")) && !!exame?.veias;

export const ehMMIIArterial = (exame) => /arterial de membros inferiores|^mmii arterial$/i.test(String(exame?.tipoNome || ""))
  && !!(exame?.arteriasDireito || exame?.arteriasEsquerdo || exame?.arterias);

// jsPDF (mm): QR + "Aponte a câmera do celular" + botão clicável "Abrir meu exame em 3D"
export function desenharQr3dRodape(doc, qr) {
  const q = qrDe(qr);
  if (!q || !q.png) return;
  doc.addImage(q.png, "PNG", 15, QR_TOPO_MM, QR_LADO_MM, QR_LADO_MM);
  doc.setFontSize(8.6);
  doc.setFont(undefined, "bold");
  doc.setTextColor(10, 127, 145);
  doc.text(TITULO, BOTAO_X, QR_TOPO_MM + 2.9);
  doc.setFont(undefined, "normal");
  doc.setFontSize(6.8);
  doc.setTextColor(60, 70, 80);
  linhasConvite(q.vasos).forEach((t, i) => doc.text(t, BOTAO_X, QR_TOPO_MM + 5.9 + i * 2.75));
  if (q.link) {
    doc.setFillColor(14, 184, 208);
    doc.roundedRect(BOTAO_X, BOTAO_Y, BOTAO_W, BOTAO_H, 1.6, 1.6, "F");
    doc.setFontSize(7.4);
    doc.setFont(undefined, "bold");
    doc.setTextColor(255, 255, 255);
    doc.text(BOTAO, BOTAO_X + BOTAO_W / 2, BOTAO_Y + 3.55, { align: "center" });
    doc.link(BOTAO_X, BOTAO_Y, BOTAO_W, BOTAO_H, { url: q.link });
    doc.link(15, QR_TOPO_MM, QR_LADO_MM, QR_LADO_MM, { url: q.link });
  }
  doc.setFont(undefined, "normal");
  doc.setTextColor(0, 0, 0);
}

// Páginas do mapa 2D (as últimas do bloco do mapa, uma por membro): o mesmo QR e o botão no rodapé
export function desenharQr3dNasPaginasDoMapa(doc, lados, qrs) {
  const total = doc.getNumberOfPages(), atual = doc.internal.getCurrentPageInfo().pageNumber;
  lados.forEach((l, i) => {
    const p = total - lados.length + 1 + i;
    if (p < 1 || !qrs || !qrs[l]) return;
    doc.setPage(p); desenharQr3dRodape(doc, qrs[l]);
  });
  doc.setPage(Math.max(atual, total));
}

// pdf-lib (pontos; y a partir de baixo)
export async function desenharQr3dRodapePdfLib(pdf, pagina, qr, fonte, rgb) {
  const q = qrDe(qr);
  if (!q || !q.png) return;
  const MM = 72 / 25.4, altura = pagina.getHeight();
  const bytes = Uint8Array.from(atob(q.png.split(",")[1] || ""), (c) => c.charCodeAt(0));
  const img = await pdf.embedPng(bytes);
  const lado = QR_LADO_MM * MM, x = 15 * MM, yBase = altura - (QR_TOPO_MM + QR_LADO_MM) * MM;
  pagina.drawImage(img, { x, y: yBase, width: lado, height: lado });
  pagina.drawText(TITULO, { x: BOTAO_X * MM, y: altura - (QR_TOPO_MM + 2.9) * MM, size: 8.6, font: fonte, color: rgb(10 / 255, 127 / 255, 145 / 255) });
  linhasConvite(q.vasos).forEach((t, i) => pagina.drawText(t, { x: BOTAO_X * MM, y: altura - (QR_TOPO_MM + 5.9 + i * 2.75) * MM, size: 6.8, font: fonte, color: rgb(0.24, 0.27, 0.31) }));
  if (!q.link) return;
  const bx = BOTAO_X * MM, by = altura - (BOTAO_Y + BOTAO_H) * MM, bw = BOTAO_W * MM, bh = BOTAO_H * MM;
  pagina.drawRectangle({ x: bx, y: by, width: bw, height: bh, color: rgb(14 / 255, 184 / 255, 208 / 255) });
  const tw = fonte.widthOfTextAtSize(BOTAO, 7.4);
  pagina.drawText(BOTAO, { x: bx + (bw - tw) / 2, y: by + 1.55 * MM, size: 7.4, font: fonte, color: rgb(1, 1, 1) });
  // links clicáveis (botão e QR)
  for (const [x1, y1, w, h] of [[bx, by, bw, bh], [x, yBase, lado, lado]]) {
    const anot = pdf.context.register(pdf.context.obj({ Type: "Annot", Subtype: "Link", Rect: [x1, y1, x1 + w, y1 + h], Border: [0, 0, 0], A: { Type: "Action", S: "URI", URI: PDFString.of(q.link) } }));
    pagina.node.addAnnot(anot);
  }
}
