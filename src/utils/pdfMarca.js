// Marca discreta no rodapé de todos os PDFs: "Laudo gerado com VENO.AI ·
// www.venoai.xyz" (o site é clicável). Fica no canto inferior esquerdo, longe
// da assinatura/dados do médico (canto direito).

export const MARCA_TEXTO = "Laudo gerado com VENO.AI";
export const MARCA_SITE = "www.venoai.xyz";
export const MARCA_URL = "https://www.venoai.xyz";

// jsPDF: carimba todas as páginas (laudo, mapas e anexos). Chamar antes do save.
export function carimbarMarcaVenoAI(doc) {
  const total = doc.internal.getNumberOfPages();
  const altura = doc.internal.pageSize.getHeight();
  const y = altura - 5;
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setFont(undefined, "normal");
    doc.setTextColor(150, 160, 170);
    const prefixo = `${MARCA_TEXTO} · `;
    doc.text(prefixo, 15, y);
    doc.setTextColor(11, 140, 160);
    doc.textWithLink(MARCA_SITE, 15 + doc.getTextWidth(prefixo), y, { url: MARCA_URL });
    doc.setTextColor(0, 0, 0);
  }
}

// pdf-lib (PDF de "Exames realizados"): mesma marca, sem link.
export function carimbarMarcaVenoAIPdfLib(doc, font, rgb) {
  doc.getPages().forEach((page) => {
    page.drawText(`${MARCA_TEXTO} · ${MARCA_SITE}`, { x: 42, y: 14, size: 7, font, color: rgb(0.59, 0.63, 0.67) });
  });
}
