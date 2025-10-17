// Função Netlify para verificar usuários Premium com verificação de senha
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
  const senha = event.queryStringParameters?.senha;
  
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
    
    // LISTA DE USUÁRIOS PREMIUM COM SENHAS
    const usuariosPremium = [
      {
        email: 'vasculargabriel@gmail.com',
        senha: '123456', // Senha padrão - você pode alterar
        nome: 'Gabriel',
        plano: 'premium'
      },
      // ADICIONAR AQUI OS OUTROS USUÁRIOS QUE PAGARAM NO HOTMART
      // Exemplo:
      // {
      //   email: 'cliente@email.com',
      //   senha: 'senha123',
      //   nome: 'Cliente',
      //   plano: 'premium'
      // },
    ];
    
    // Verificar se email existe na lista Premium
    const usuarioPremium = usuariosPremium.find(user => 
      user.email.toLowerCase() === email.toLowerCase()
    );
    
    if (usuarioPremium) {
      console.log(`✅ Email Premium encontrado: ${email}`);
      
      // Se senha foi fornecida, verificar senha
      if (senha) {
        if (usuarioPremium.senha === senha) {
          console.log(`🔐 Senha correta para: ${email}`);
          
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
              fonte: 'premium-confirmado',
              nome: usuarioPremium.nome,
              timestamp: new Date().toISOString(),
              mensagem: 'Usuário Premium confirmado! Senha correta!'
            })
          };
        } else {
          console.log(`❌ Senha incorreta para: ${email}`);
          
          return {
            statusCode: 401,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
              email: email,
              premium: false,
              plano: 'trial',
              status: 'error',
              fonte: 'senha-incorreta',
              timestamp: new Date().toISOString(),
              mensagem: 'Senha incorreta! Tente novamente.'
            })
          };
        }
      } else {
        // Senha não fornecida, mas email é Premium
        console.log(`⚠️ Email Premium sem senha: ${email}`);
        
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
            fonte: 'premium-sem-senha',
            nome: usuarioPremium.nome,
            timestamp: new Date().toISOString(),
            mensagem: 'Email Premium encontrado! Forneça a senha para confirmar.'
          })
        };
      }
    }
    
    // LISTA DE EMAILS QUE PAGARAM NO HOTMART (sem senha específica)
    const emailsHotmartPagaram = [
      'vasculargabriel@gmail.com', // Email do desenvolvedor
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
    
    // Se não é Premium, retornar como Trial
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
