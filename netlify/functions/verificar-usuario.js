// Função Netlify para verificar usuários Premium com integração Hotmart
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
    console.log(`🔍 Verificando usuário: ${email}`);
    
    // LISTA DE EMAILS PREMIUM CONFIRMADOS
    const emailsPremiumConfirmados = [
      'vasculargabriel@gmail.com',
      // ADICIONAR AQUI OS EMAILS DOS CLIENTES QUE PAGARAM
      // Exemplo: 'cliente@email.com',
      // Exemplo: 'outro@email.com',
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
    
    // VERIFICAÇÃO COM HOTMART
    console.log(`🌐 Verificando pagamento Hotmart para: ${email}`);
    
    // Lista de emails que pagaram no Hotmart
    // Você deve manter esta lista atualizada com os emails dos clientes que pagaram
    const emailsHotmartPagaram = [
      // ADICIONAR AQUI OS EMAILS DOS CLIENTES QUE PAGARAM NO HOTMART
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
