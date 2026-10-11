// Cabeçalho e assinatura dos laudos em PDF, iguais em todos os exames.
// Logo e assinatura mantêm a proporção (antes o logo era esticado num
// quadrado 20x20 mm e a assinatura em 50x15 mm).

function formatoDaImagem(dataUrl) {
  return /^data:image\/jpe?g/i.test(dataUrl || "") ? "JPEG" : "PNG";
}

// Tamanho em mm que cabe na caixa maxW x maxH sem distorcer.
export function tamanhoProporcional(larguraPx, alturaPx, maxW, maxH) {
  if (!(larguraPx > 0) || !(alturaPx > 0)) return { w: maxH, h: maxH };
  const escala = Math.min(maxW / larguraPx, maxH / alturaPx);
  return { w: larguraPx * escala, h: alturaPx * escala };
}

// Desenha a imagem dentro da caixa (x, y, maxW, maxH), alinhada à esquerda,
// ao centro ou à direita e encostada embaixo (alinharBase) ou em cima.
// Devolve o tamanho usado, ou null se a imagem não puder ser lida.
export function desenharImagemProporcional(doc, dataUrl, { x, y, maxW, maxH, alinhar = "esquerda", alinharBase = false }) {
  if (!dataUrl) return null;
  try {
    const props = doc.getImageProperties(dataUrl);
    const { w, h } = tamanhoProporcional(props.width, props.height, maxW, maxH);
    const px = alinhar === "direita" ? x + maxW - w : alinhar === "centro" ? x + (maxW - w) / 2 : x;
    const py = alinharBase ? y + maxH - h : y;
    doc.addImage(dataUrl, formatoDaImagem(dataUrl), px, py, w, h);
    return { w, h };
  } catch (e) {
    return null;
  }
}

const TOPO = 14;
const MARGEM_ESQ = 15;
const MARGEM_DIR = 200;
const LOGO_MAX_W = 50;
const LOGO_MAX_H = 20;
const ALTURA_LINHA = 4.6;

// Logo à esquerda e os dados da clínica à direita (quebrando a linha se
// precisar, sem invadir o logo). Devolve o y onde o texto do laudo começa.
export function desenharCabecalhoLaudo(doc, { logo, linhas, fonteCorpo = 11 }) {
  const tamLogo = desenharImagemProporcional(doc, logo, { x: MARGEM_ESQ, y: TOPO, maxW: LOGO_MAX_W, maxH: LOGO_MAX_H });
  const textos = (linhas || []).filter((t) => t && String(t).trim());
  doc.setFontSize(9);
  doc.setFont(undefined, "bold");
  const inicioTexto = tamLogo ? MARGEM_ESQ + tamLogo.w + 8 : 70;
  const largura = MARGEM_DIR - inicioTexto;
  let y = TOPO + 4;
  textos.forEach((t) => {
    doc.splitTextToSize(String(t), largura).forEach((parte) => {
      doc.text(parte, MARGEM_DIR, y, { align: "right" });
      y += ALTURA_LINHA;
    });
  });
  doc.setFont(undefined, "normal");
  doc.setFontSize(fonteCorpo);
  const altura = Math.max(tamLogo ? tamLogo.h : 0, textos.length ? y - ALTURA_LINHA - TOPO + 2 : 0);
  if (!tamLogo && !textos.length) return 20;
  return TOPO + altura + 8;
}

// Assinatura acima da linha "Assinatura: ____", alinhada à direita.
export function desenharAssinatura(doc, assinatura, yRodape) {
  return desenharImagemProporcional(doc, assinatura, { x: 150, y: yRodape - 18, maxW: 50, maxH: 15, alinhar: "direita", alinharBase: true });
}
