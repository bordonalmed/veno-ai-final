// Integração com Hotmart para verificar pagamentos automaticamente
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
    console.log(`🔍 Verificando pagamento Hotmart para: ${email}`);
    
    // LISTA DE EMAILS PREMIUM CONFIRMADOS (você pode adicionar manualmente)
    const emailsPremiumConfirmados = [
      'vasculargabriel@gmail.com',
      // Adicionar outros emails Premium confirmados aqui
    ];
    
    // Verificar se está na lista de Premium confirmados primeiro
    if (emailsPremiumConfirmados.includes(email.toLowerCase())) {
      console.log(`✅ Email confirmado na lista Premium: ${email}`);
      
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          email: email,
          premium: true,
          plano: 'premium',
          status: 'success',
          fonte: 'lista-confirmada',
          timestamp: new Date().toISOString(),
          mensagem: 'Usuário Premium confirmado!'
        })
      };
    }
    
    // SIMULAÇÃO DE VERIFICAÇÃO COM HOTMART
    // Em produção, você faria uma requisição real para a API do Hotmart
    console.log(`🌐 Simulando verificação Hotmart para: ${email}`);
    
    // Lista simulada de emails que pagaram no Hotmart
    // Você deve manter esta lista atualizada com os emails dos clientes que pagaram
    const emailsHotmartPagaram = [
      'vasculargabriel@gmail.com', // Email do desenvolvedor
      // Adicionar aqui os emails dos clientes que pagaram no Hotmart
      // Exemplo: 'cliente1@email.com',
      // Exemplo: 'cliente2@email.com',
    ];
    
    const pagouHotmart = emailsHotmartPagaram.includes(email.toLowerCase());
    
    if (pagouHotmart) {
      console.log(`💎 Pagamento confirmado no Hotmart: ${email}`);
      
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          email: email,
          premium: true,
          plano: 'premium',
          status: 'success',
          fonte: 'hotmart',
          timestamp: new Date().toISOString(),
          mensagem: 'Pagamento confirmado no Hotmart! Premium ativado!'
        })
      };
    }
    
    // Se não pagou, retornar como Trial
    console.log(`📝 Usuário Trial: ${email}`);
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        email: email,
        premium: false,
        plano: 'trial',
        status: 'success',
        fonte: 'trial',
        timestamp: new Date().toISOString(),
        mensagem: 'Usuário Trial - Faça upgrade para Premium!'
      })
    };
    
  } catch (error) {
    console.error('❌ Erro na verificação Hotmart:', error);
    
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
