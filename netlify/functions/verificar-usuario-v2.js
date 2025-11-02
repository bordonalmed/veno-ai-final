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
    // Verificar no Supabase primeiro
    let isPremium = false;
    let fontePremium = 'trial';

    const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL || process.env.SUPABASE_URL;
    const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

    if (SUPABASE_URL && SUPABASE_SERVICE_KEY) {
      try {
        const { createClient } = require('@supabase/supabase-js');
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
        
        const { data: userData, error: supabaseError } = await supabase
          .from('users')
          .select('premium, plano')
          .eq('email', email.toLowerCase())
          .single();

        if (!supabaseError && userData && userData.premium === true) {
          isPremium = true;
          fontePremium = 'supabase';
          console.log(`✅ Usuário Premium encontrado no Supabase: ${email}`);
        }
      } catch (supabaseErr) {
        console.warn('⚠️ Erro ao verificar no Supabase:', supabaseErr);
      }
    }

    // Se não encontrou no Supabase, verificar lista manual (fallback)
    if (!isPremium) {
      // LISTA DE EMAILS PREMIUM CONFIRMADOS (fallback)
      const emailsPremiumConfirmados = [
        'vasculargabriel@gmail.com',
        // ADICIONAR AQUI OS EMAILS DOS CLIENTES QUE PAGARAM
        // Exemplo: 'cliente@email.com',
        // Exemplo: 'outro@email.com',
      ];
      
      // Verificar se está na lista de Premium confirmados
      const isPremiumConfirmado = emailsPremiumConfirmados.includes(email.toLowerCase());
      
      if (isPremiumConfirmado) {
        isPremium = true;
        fontePremium = 'lista-confirmada';
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
        fonte: fontePremium
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
