/**
 * Utilitário para adicionar imagens anexadas ao PDF
 * Replica exatamente a lógica do MMII Venoso
 */

/**
 * Adiciona imagens anexadas como páginas no final do PDF
 * @param {jsPDF} pdf - Instância do jsPDF
 * @param {Array} anexos - Array de anexos no formato do MMII Venoso
 * @param {Object} options - Opções de configuração
 * @param {number} options.margin - Margem em mm (padrão: 15)
 * @param {number} options.titleSpace - Espaço para título em mm (padrão: 25)
 */
export function appendImagesToPdf(pdf, anexos, { margin = 15, titleSpace = 25 } = {}) {
  if (!anexos || anexos.length === 0) {
    return;
  }

  anexos.forEach((anexo, index) => {
    try {
      pdf.addPage();
      
      // Adicionar título da imagem
      pdf.setFontSize(14);
      pdf.setFont(undefined, "bold");
      pdf.text(`Anexo ${index + 1}: ${anexo.name}`, margin, 20);
      
      // Adicionar a imagem aproveitando melhor a página
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      
      // Calcular dimensões disponíveis
      const availableWidth = pageWidth - (margin * 2);
      const availableHeight = pageHeight - titleSpace - (margin * 2);
      
      // Cabe na área disponível SEM distorcer: mantém a proporção da foto
      // (antes ela era esticada para a página inteira) e centraliza.
      const formato = /^data:image\/jpe?g/i.test(anexo.thumbnail || "") ? "JPEG" : "PNG";
      let largura = availableWidth;
      let altura = availableHeight;
      try {
        const props = pdf.getImageProperties(anexo.thumbnail);
        const escala = Math.min(availableWidth / props.width, availableHeight / props.height);
        largura = props.width * escala;
        altura = props.height * escala;
      } catch (e) {
        // sem as dimensões, usa a área toda (comportamento antigo)
      }
      const x = margin + (availableWidth - largura) / 2;
      pdf.addImage(anexo.thumbnail, formato, x, titleSpace, largura, altura);

    } catch (error) {
      console.error('Erro ao adicionar anexo ao PDF:', error);
      
      // Adicionar página de erro para este anexo
      pdf.addPage();
      pdf.setFontSize(12);
      pdf.text(`Erro ao processar anexo: ${anexo.name}`, margin, 20);
    }
  });
}
