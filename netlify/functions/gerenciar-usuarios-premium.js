// Função para gerenciar usuários Premium com senhas
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
  
  const { email, senha, nome, acao } = event.queryStringParameters || {};
  
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
    
    // LISTA ATUAL DE USUÁRIOS PREMIUM COM SENHAS
    const usuariosPremium = [
      {
        email: 'vasculargabriel@gmail.com',
        senha: '123456',
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
    
    if (acao === 'adicionar') {
      // Adicionar usuário Premium com senha
      if (!senha) {
        return {
          statusCode: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          body: JSON.stringify({
            error: 'Senha é obrigatória para usuários Premium',
            success: false
          })
        };
      }
      
      const usuarioExistente = usuariosPremium.find(user => 
        user.email.toLowerCase() === email.toLowerCase()
      );
      
      if (usuarioExistente) {
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
            mensagem: 'Usuário já está na lista Premium!',
            timestamp: new Date().toISOString()
          })
        };
      }
      
      // Adicionar novo usuário Premium
      usuariosPremium.push({
        email: email.toLowerCase(),
        senha: senha,
        nome: nome || 'Cliente',
        plano: 'premium'
      });
      
      console.log(`✅ Usuário Premium adicionado: ${email}`);
      
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
          mensagem: 'Usuário Premium adicionado com sucesso!',
          timestamp: new Date().toISOString()
        })
      };
    }
    
    if (acao === 'verificar') {
      // Verificar se usuário é Premium
      const usuarioPremium = usuariosPremium.find(user => 
        user.email.toLowerCase() === email.toLowerCase()
      );
      
      if (usuarioPremium) {
        return {
          statusCode: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          body: JSON.stringify({
            success: true,
            email: email,
            premium: true,
            plano: 'premium',
            nome: usuarioPremium.nome,
            mensagem: 'Usuário Premium confirmado!',
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
            premium: false,
            plano: 'trial',
            mensagem: 'Usuário não encontrado na lista Premium',
            timestamp: new Date().toISOString()
          })
        };
      }
    }
    
    if (acao === 'listar') {
      // Listar todos os usuários Premium (sem senhas por segurança)
      const usuariosSemSenha = usuariosPremium.map(user => ({
        email: user.email,
        nome: user.nome,
        plano: user.plano
      }));
      
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          success: true,
          usuariosPremium: usuariosSemSenha,
          total: usuariosPremium.length,
          timestamp: new Date().toISOString()
        })
      };
    }
    
    if (acao === 'alterar-senha') {
      // Alterar senha de usuário Premium
      if (!senha) {
        return {
          statusCode: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          body: JSON.stringify({
            error: 'Nova senha é obrigatória',
            success: false
          })
        };
      }
      
      const usuarioPremium = usuariosPremium.find(user => 
        user.email.toLowerCase() === email.toLowerCase()
      );
      
      if (usuarioPremium) {
        usuarioPremium.senha = senha;
        console.log(`🔐 Senha alterada para: ${email}`);
        
        return {
          statusCode: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          body: JSON.stringify({
            success: true,
            email: email,
            acao: 'senha-alterada',
            mensagem: 'Senha alterada com sucesso!',
            timestamp: new Date().toISOString()
          })
        };
      } else {
        return {
          statusCode: 404,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          body: JSON.stringify({
            error: 'Usuário Premium não encontrado',
            success: false
          })
        };
      }
    }
    
    // Ação não reconhecida
    return {
      statusCode: 400,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        error: 'Ação não reconhecida. Use: adicionar, verificar, listar ou alterar-senha',
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
