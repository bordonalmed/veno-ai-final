// Função para verificar e corrigir status Premium de usuários específicos
const { createClient } = require('@supabase/supabase-js');
const { requireAdminKey } = require('./_shared/adminAuth');

exports.handler = async (event, context) => {
  // Permitir CORS
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Key',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
      },
      body: ''
    };
  }

  // Endpoint administrativo: exige a chave secreta (header X-Admin-Key)
  const authError = requireAdminKey(event);
  if (authError) return authError;

  const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL || process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        error: 'Supabase não configurado',
        success: false
      })
    };
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  try {
    // Lista de emails que devem ser Premium
    const emailsPremium = [
      'vasculargabriel@gmail.com',
      'bordonalmed@yahoo.com.br'
    ];

    const resultados = [];

    for (const email of emailsPremium) {
      const emailLower = email.toLowerCase().trim();
      
      console.log(`🔍 Verificando: ${emailLower}`);

      // Buscar usuário na tabela users
      const { data: user, error: findError } = await supabase
        .from('users')
        .select('*')
        .eq('email', emailLower)
        .single();

      if (findError && findError.code === 'PGRST116') {
        // Usuário não encontrado na tabela users
        console.log(`⚠️ Usuário não encontrado na tabela users: ${emailLower}`);
        
        // Tentar buscar no auth.users usando service key
        // Nota: Não temos acesso direto ao auth.users, então vamos criar o perfil
        // Se o usuário existe no auth mas não na tabela users, precisamos criar
        
        resultados.push({
          email: emailLower,
          status: 'nao_encontrado_na_tabela',
          mensagem: 'Usuário não encontrado na tabela users. Cliente precisa fazer login no sistema primeiro para criar o perfil.',
          acao_necessaria: 'Cliente deve fazer cadastro/login no sistema primeiro'
        });
        continue;
      }

      if (findError) {
        resultados.push({
          email: emailLower,
          status: 'erro_busca',
          mensagem: `Erro ao buscar: ${findError.message}`,
          erro: findError
        });
        continue;
      }

      console.log(`✅ Usuário encontrado: ${user.email}, Premium atual: ${user.premium}`);

      // Verificar e atualizar Premium
      const precisaAtualizar = !user.premium || user.plano !== 'premium';

      if (precisaAtualizar) {
        console.log(`💎 Ativando Premium para: ${emailLower}`);
        
        const { error: updateError } = await supabase
          .from('users')
          .update({
            premium: true,
            plano: 'premium',
            trial_ativo: false,
            updated_at: new Date().toISOString()
          })
          .eq('id', user.id);

        if (updateError) {
          resultados.push({
            email: emailLower,
            status: 'erro_atualizacao',
            mensagem: `Erro ao atualizar Premium: ${updateError.message}`,
            erro: updateError
          });
        } else {
          resultados.push({
            email: emailLower,
            status: 'premium_ativado',
            mensagem: 'Premium ativado com sucesso!',
            premium_anterior: user.premium,
            premium_atual: true,
            userId: user.id
          });
        }
      } else {
        resultados.push({
          email: emailLower,
          status: 'ja_e_premium',
          mensagem: 'Usuário já é Premium',
          premium: user.premium,
          plano: user.plano,
          userId: user.id
        });
      }
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: true,
        resultados,
        timestamp: new Date().toISOString()
      })
    };

  } catch (error) {
    console.error('❌ Erro ao processar:', error);

    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        error: 'Erro interno do servidor',
        success: false,
        details: error.message
      })
    };
  }
};
