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

    // Se não encontrou no Supabase, verificar lista de emails que pagaram no Hotmart
    if (!isPremium) {
      // LISTA DE EMAILS QUE PAGARAM NO HOTMART E PRECISAM TER PREMIUM
      // Esta lista pode ser atualizada automaticamente via webhook ou manualmente
      const emailsPagaramNoHotmart = [
        'vasculargabriel@gmail.com',
        'bordonalmed@yahoo.com.br',
        // ADICIONAR AQUI OS EMAILS DOS CLIENTES QUE PAGARAM NO HOTMART
        // Exemplo: 'cliente@email.com',
        // Exemplo: 'outro@email.com',
      ];
      
      // Verificar se está na lista de quem pagou no Hotmart
      const pagouNoHotmart = emailsPagaramNoHotmart.includes(email.toLowerCase());
      
      if (pagouNoHotmart) {
        // Se pagou no Hotmart mas não é Premium no Supabase, ativar automaticamente
        if (SUPABASE_URL && SUPABASE_SERVICE_KEY) {
          try {
            const { createClient } = require('@supabase/supabase-js');
            const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
            
            // Buscar usuário
            const { data: user, error: findError } = await supabase
              .from('users')
              .select('id, email, premium')
              .eq('email', email.toLowerCase())
              .single();

            if (!findError && user) {
              // Ativar Premium automaticamente se pagou no Hotmart
              const { error: updateError } = await supabase
                .from('users')
                .update({
                  premium: true,
                  plano: 'premium',
                  trial_ativo: false,
                  updated_at: new Date().toISOString()
                })
                .eq('id', user.id);

              if (!updateError) {
                isPremium = true;
                fontePremium = 'hotmart-ativado-automaticamente';
                console.log(`✅ Premium ativado automaticamente para quem pagou no Hotmart: ${email}`);
              }
            } else if (findError && findError.code === 'PGRST116') {
              // Usuário não existe na tabela users ainda
              // Mas pagou no Hotmart, então será ativado quando fizer login
              isPremium = true; // Dar acesso, será criado no login
              fontePremium = 'hotmart-pendente-login';
              console.log(`💡 Cliente pagou no Hotmart mas precisa fazer login primeiro: ${email}`);
            }
          } catch (supabaseErr) {
            console.warn('⚠️ Erro ao ativar Premium no Supabase:', supabaseErr);
            // Fallback: dar acesso mesmo assim
            isPremium = true;
            fontePremium = 'hotmart-lista';
          }
        } else {
          // Supabase não configurado, usar lista
          isPremium = true;
          fontePremium = 'hotmart-lista';
        }
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
