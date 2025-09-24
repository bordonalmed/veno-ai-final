// Configuração do Hotmart
export const HOTMART_CONFIG = {
  // ID do seu produto no Hotmart
  PRODUCT_ID: 'S102049895B',
  
  // Link de checkout
  CHECKOUT_URL: 'https://pay.hotmart.com/S102049895B',
  
  // URL do webhook (substitua pelo seu domínio)
  WEBHOOK_URL: 'https://seu-dominio.com/api/hotmart-webhook',
  
  // Eventos do webhook que você quer receber
  WEBHOOK_EVENTS: [
    'PURCHASE_APPROVED',    // Pagamento aprovado
    'PURCHASE_CANCELLED',   // Pagamento cancelado
    'PURCHASE_REFUNDED'     // Pagamento estornado
  ],
  
  // Configurações de teste
  TEST_MODE: true,  // Mude para false em produção
  
  // Dados de teste (apenas para desenvolvimento)
  TEST_DATA: {
    buyer_email: 'teste@exemplo.com',
    transaction_id: 'TEST_' + Date.now(),
    product_id: 'S102049895B',
    amount: 97.00
  }
};

// Função para simular webhook em desenvolvimento
export function simularWebhookHotmart(email) {
  if (!HOTMART_CONFIG.TEST_MODE) {
    return null;
  }
  
  return {
    event: 'PURCHASE_APPROVED',
    data: {
      buyer_email: email,
      transaction_id: HOTMART_CONFIG.TEST_DATA.transaction_id,
      product_id: HOTMART_CONFIG.PRODUCT_ID,
      amount: HOTMART_CONFIG.TEST_DATA.amount,
      purchase_date: new Date().toISOString()
    }
  };
}
