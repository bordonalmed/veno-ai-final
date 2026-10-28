// Padrão de todos os exames: "Salvar PDF" baixa o PDF e limpa o formulário
// para o próximo paciente. Como não dá para desfazer, confirma antes.
// ("Enviar laudo" gera o mesmo PDF sem passar por aqui e não limpa nada.)
export const MENSAGEM_PDF_LIMPAR = "Isso vai baixar o PDF e limpar o formulário para um novo exame. Deseja continuar?";

export function confirmarPdfELimpar() {
  return window.confirm(MENSAGEM_PDF_LIMPAR);
}
