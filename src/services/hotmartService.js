// Serviço de integração com Hotmart
export class HotmartService {
  static async verificarPagamento(transactionId) {
    try {
      // Simular chamada para API do Hotmart
      // Em produção, isso seria uma chamada real para a API do Hotmart
      const response = await fetch(`/api/hotmart/transaction/${transactionId}`);
      
      if (response.ok) {
        const data = await response.json();
        return {
          status: 'approved',
          transactionId: data.transaction_id,
          email: data.buyer_email,
          productId: data.product_id,
          amount: data.amount
        };
      }
      
      return { status: 'pending' };
    } catch (error) {
      console.error('Erro ao verificar pagamento:', error);
      return { status: 'error' };
    }
  }


  static async processarWebhook(webhookData) {
    try {
      // Processar dados do webhook do Hotmart
      const { event, data } = webhookData;
      
      if (event === 'PURCHASE_APPROVED') {
        // Pagamento aprovado
        const { buyer_email, product_id, transaction_id } = data;
        
        // Ativar plano Premium para o usuário
        await this.ativarPlanoPremium(buyer_email, transaction_id);
        
        return { success: true, message: 'Plano ativado com sucesso' };
      }
      
      return { success: false, message: 'Evento não processado' };
    } catch (error) {
      console.error('Erro ao processar webhook:', error);
      return { success: false, message: 'Erro interno' };
    }
  }

  static async ativarPlanoPremium(email, transactionId) {
    try {
      // Importar TrialManager dinamicamente para evitar dependência circular
      const { TrialManager } = await import('../utils/trialManager');
      
      // Definir plano Premium (agora salva no Firebase também)
      await TrialManager.definirPlanoUsuario(email, 'premium');
      
      // Salvar dados da transação
      localStorage.setItem(`transacao_${email}`, JSON.stringify({
        transactionId,
        dataAtivacao: new Date().toISOString(),
        status: 'active'
      }));
      
      console.log(`✅ Plano Premium ativado para: ${email}`);
      return true;
    } catch (error) {
      console.error('Erro ao ativar plano Premium:', error);
      return false;
    }
  }

  static obterStatusTransacao(email) {
    const transacao = localStorage.getItem(`transacao_${email}`);
    return transacao ? JSON.parse(transacao) : null;
  }
}
