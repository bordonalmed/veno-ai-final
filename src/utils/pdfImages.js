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

  console.log('Processando anexos:', anexos.length, 'anexos encontrados');

  anexos.forEach((anexo, index) => {
    try {
      console.log(`Processando anexo ${index + 1}:`, anexo.name);
      
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
      
      // Adicionar a imagem centralizada e redimensionada para aproveitar toda a página
      // Usar thumbnail como no MMII Venoso
      pdf.addImage(anexo.thumbnail, 'PNG', margin, titleSpace, availableWidth, availableHeight);
      
      console.log(`Anexo ${index + 1} adicionado com sucesso`);
    } catch (error) {
      console.error('Erro ao adicionar anexo ao PDF:', error);
      
      // Adicionar página de erro para este anexo
      pdf.addPage();
      pdf.setFontSize(12);
      pdf.text(`Erro ao processar anexo: ${anexo.name}`, margin, 20);
    }
  });
}
