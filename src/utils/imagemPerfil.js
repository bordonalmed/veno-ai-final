// Prepara logo e assinatura antes de guardar: corta as bordas vazias
// (transparentes ou brancas), reduz para no máximo maxW x maxH pixels e grava
// em PNG (se tiver transparência) ou JPEG. Uma foto de 2 MB vira algo em
// torno de 50-150 KB, o que evita estourar o espaço do navegador.

// Retângulo com conteúdo (ignora pixels transparentes ou quase brancos).
export function calcularRecorte(dados, largura, altura, { limiarAlpha = 16, limiarBranco = 245 } = {}) {
  let x0 = largura, y0 = altura, x1 = -1, y1 = -1;
  for (let y = 0; y < altura; y++) {
    for (let x = 0; x < largura; x++) {
      const i = (y * largura + x) * 4;
      const vazio = dados[i + 3] < limiarAlpha || (dados[i] > limiarBranco && dados[i + 1] > limiarBranco && dados[i + 2] > limiarBranco);
      if (!vazio) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  if (x1 < 0) return { x: 0, y: 0, w: largura, h: altura }; // imagem vazia: não corta
  const folga = Math.round(Math.max(largura, altura) * 0.02);
  const x = Math.max(0, x0 - folga), y = Math.max(0, y0 - folga);
  return { x, y, w: Math.min(largura, x1 + folga + 1) - x, h: Math.min(altura, y1 + folga + 1) - y };
}

export function temTransparencia(dados) {
  for (let i = 3; i < dados.length; i += 4) if (dados[i] < 250) return true;
  return false;
}

function carregarImagem(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Não foi possível ler a imagem."));
    img.src = src;
  });
}

export function lerArquivoComoDataUrl(arquivo) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(new Error("Não foi possível ler o arquivo."));
    r.readAsDataURL(arquivo);
  });
}

// arquivoOuDataUrl: File (upload) ou data URL (assinatura desenhada).
export async function prepararImagem(arquivoOuDataUrl, { maxW = 800, maxH = 400 } = {}) {
  const src = typeof arquivoOuDataUrl === "string" ? arquivoOuDataUrl : await lerArquivoComoDataUrl(arquivoOuDataUrl);
  const img = await carregarImagem(src);
  const base = document.createElement("canvas");
  base.width = img.naturalWidth || img.width;
  base.height = img.naturalHeight || img.height;
  const ctx = base.getContext("2d");
  ctx.drawImage(img, 0, 0);
  const dados = ctx.getImageData(0, 0, base.width, base.height).data;
  const r = calcularRecorte(dados, base.width, base.height);
  const transparente = temTransparencia(dados);
  const escala = Math.min(1, maxW / r.w, maxH / r.h);
  const saida = document.createElement("canvas");
  saida.width = Math.max(1, Math.round(r.w * escala));
  saida.height = Math.max(1, Math.round(r.h * escala));
  const c2 = saida.getContext("2d");
  if (!transparente) {
    c2.fillStyle = "#ffffff";
    c2.fillRect(0, 0, saida.width, saida.height);
  }
  c2.imageSmoothingQuality = "high";
  c2.drawImage(base, r.x, r.y, r.w, r.h, 0, 0, saida.width, saida.height);
  return transparente ? saida.toDataURL("image/png") : saida.toDataURL("image/jpeg", 0.9);
}
