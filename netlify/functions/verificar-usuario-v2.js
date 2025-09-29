// Função para verificar pagamentos no Hotmart
exports.handler = async (event, context) => {
  // Permitir CORS
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
      },
      body: ''
    };
  }
  
  const email = event.queryStringParameters?.email;
  
  if (!email) {
    return {
      statusCode: 400,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ 
        error: 'Email é obrigatório',
        premium: false,
        plano: 'trial'
      })
    };
  }
  
  try {
    // LISTA DE EMAILS PREMIUM CONFIRMADOS
    const emailsPremiumConfirmados = [
      'vasculargabriel@gmail.com',
      // ADICIONAR AQUI OS EMAILS DOS CLIENTES QUE PAGARAM
      // Exemplo: 'cliente@email.com',
      // Exemplo: 'outro@email.com',
    ];
    
    // Verificar se está na lista de Premium confirmados
    const isPremiumConfirmado = emailsPremiumConfirmados.includes(email.toLowerCase());
    
    // Se não estiver na lista, verificar com Hotmart (simulação)
    let isPremiumHotmart = false;
    
    if (!isPremiumConfirmado) {
      // SIMULAÇÃO: Verificar com Hotmart
      // Em produção, você faria uma requisição real para a API do Hotmart
      console.log(`🔍 Verificando pagamento Hotmart para: ${email}`);
      
      // Lista de emails que pagaram no Hotmart (você deve manter atualizada)
      const emailsHotmart = [
        // Adicionar emails que pagaram no Hotmart aqui
        // Exemplo: 'cliente1@email.com',
        // Exemplo: 'cliente2@email.com',
      ];
      
      isPremiumHotmart = emailsHotmart.includes(email.toLowerCase());
    }
    
    const isPremium = isPremiumConfirmado || isPremiumHotmart;
    
    console.log(`🔍 Verificando usuário: ${email} - Premium: ${isPremium}`);
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        email: email,
        premium: isPremium,
        plano: isPremium ? 'premium' : 'trial',
        status: 'success',
        timestamp: new Date().toISOString(),
        mensagem: isPremium ? 'Usuário Premium detectado!' : 'Usuário Trial',
        fonte: isPremiumConfirmado ? 'lista-confirmada' : (isPremiumHotmart ? 'hotmart' : 'trial')
      })
    };
    
  } catch (error) {
    console.error('❌ Erro na verificação:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        error: 'Erro interno do servidor',
        premium: false,
        plano: 'trial'
      })
    };
  }
};
