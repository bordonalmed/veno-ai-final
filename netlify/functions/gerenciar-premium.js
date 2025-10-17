// Função para adicionar clientes que pagaram no Hotmart
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
  
  const { email, acao } = event.queryStringParameters || {};
  
  if (!email) {
    return {
      statusCode: 400,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ 
        error: 'Email é obrigatório',
        success: false
      })
    };
  }
  
  try {
    console.log(`🔧 Ação: ${acao} para email: ${email}`);
    
    // LISTA ATUAL DE EMAILS QUE PAGARAM NO HOTMART
    // IMPORTANTE: Adicione aqui os emails dos clientes que pagaram
    const emailsHotmartPagaram = [
      'vasculargabriel@gmail.com', // Email do desenvolvedor
      // ADICIONAR AQUI OS EMAILS DOS CLIENTES QUE PAGARAM NO HOTMART
      // Exemplo: 'cliente1@email.com',
      // Exemplo: 'cliente2@email.com',
    ];
    
    if (acao === 'adicionar') {
      // Adicionar email à lista de pagadores
      if (!emailsHotmartPagaram.includes(email.toLowerCase())) {
        emailsHotmartPagaram.push(email.toLowerCase());
        console.log(`✅ Email adicionado à lista Premium: ${email}`);
        
        return {
          statusCode: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          body: JSON.stringify({
            success: true,
            email: email,
            acao: 'adicionado',
            mensagem: 'Email adicionado à lista Premium!',
            timestamp: new Date().toISOString()
          })
        };
      } else {
        return {
          statusCode: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          body: JSON.stringify({
            success: true,
            email: email,
            acao: 'ja-existe',
            mensagem: 'Email já está na lista Premium!',
            timestamp: new Date().toISOString()
          })
        };
      }
    }
    
    if (acao === 'verificar') {
      // Verificar se email está na lista
      const isPremium = emailsHotmartPagaram.includes(email.toLowerCase());
      
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          success: true,
          email: email,
          premium: isPremium,
          plano: isPremium ? 'premium' : 'trial',
          mensagem: isPremium ? 'Email confirmado como Premium!' : 'Email não encontrado na lista Premium',
          timestamp: new Date().toISOString()
        })
      };
    }
    
    if (acao === 'listar') {
      // Listar todos os emails Premium
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          success: true,
          emailsPremium: emailsHotmartPagaram,
          total: emailsHotmartPagaram.length,
          timestamp: new Date().toISOString()
        })
      };
    }
    
    // Ação não reconhecida
    return {
      statusCode: 400,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        error: 'Ação não reconhecida. Use: adicionar, verificar ou listar',
        success: false
      })
    };
    
  } catch (error) {
    console.error('❌ Erro na operação:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        error: 'Erro interno do servidor',
        success: false
      })
    };
  }
};
