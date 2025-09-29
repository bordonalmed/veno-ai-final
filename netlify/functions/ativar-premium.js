// Sistema de códigos de ativação para usuários Premium
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
  
  const { email, codigo } = event.queryStringParameters || {};
  
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
    ];
    
    // CÓDIGOS DE ATIVAÇÃO VÁLIDOS
    const codigosValidos = [
      'VENO2024',
      'PREMIUM2024',
      'HOTMART2024',
      // Adicionar códigos conforme necessário
    ];
    
    // Verificar se está na lista de Premium confirmados
    let isPremium = emailsPremiumConfirmados.includes(email.toLowerCase());
    
    // Se não estiver na lista, verificar código de ativação
    if (!isPremium && codigo) {
      if (codigosValidos.includes(codigo.toUpperCase())) {
        isPremium = true;
        console.log(`🎉 Código válido usado por: ${email}`);
      } else {
        console.log(`❌ Código inválido usado por: ${email}: ${codigo}`);
      }
    }
    
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
        codigoUsado: codigo || null,
        codigoValido: codigo ? codigosValidos.includes(codigo.toUpperCase()) : null
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
