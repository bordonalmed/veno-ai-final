// Rasteriza um SVG (string) em JPEG (data URL) para inserir em PDF com jsPDF.
export function svgParaImagemDataUrl(svgString, largura, altura) {
  return new Promise((resolve, reject) => {
    const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      const escala = 2; // suficiente para nitidez em A4, sem inflar o arquivo
      const canvas = document.createElement("canvas");
      canvas.width = largura * escala;
      canvas.height = altura * escala;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      // JPEG reduz bastante o tamanho do PDF; sem transparência no desenho, não perde qualidade visível
      resolve(canvas.toDataURL("image/jpeg", 0.88));
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
    img.src = url;
  });
}
