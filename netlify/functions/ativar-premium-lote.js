// Função para ativar Premium em lote para usuários que já pagaram
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
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS'
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
    // Se GET, retornar instruções
    if (event.httpMethod === 'GET') {
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          message: 'Envie lista de emails via POST',
          exemplo: {
            emails: ['cliente1@email.com', 'cliente2@email.com']
          },
          uso: 'POST com body JSON contendo array de emails'
        })
      };
    }

    // Se POST, processar lista de emails
    const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    const { emails } = body;

    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          error: 'Envie um array de emails no formato: { "emails": ["email1@exemplo.com", "email2@exemplo.com"] }',
          success: false
        })
      };
    }

    console.log(`💎 Ativando Premium para ${emails.length} usuários...`);

    const resultados = [];
    let sucessos = 0;
    let erros = 0;
    let naoEncontrados = 0;

    for (const email of emails) {
      try {
        const emailLower = email.toLowerCase().trim();

        // Buscar usuário
        const { data: user, error: findError } = await supabase
          .from('users')
          .select('id, email, premium')
          .eq('email', emailLower)
          .single();

        if (findError && findError.code === 'PGRST116') {
          // Usuário não encontrado
          resultados.push({
            email: emailLower,
            status: 'nao_encontrado',
            mensagem: 'Usuário não encontrado. Precisa se cadastrar primeiro.'
          });
          naoEncontrados++;
          continue;
        }

        if (findError) {
          resultados.push({
            email: emailLower,
            status: 'erro',
            mensagem: `Erro ao buscar: ${findError.message}`
          });
          erros++;
          continue;
        }

        // Atualizar Premium
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
            status: 'erro',
            mensagem: `Erro ao atualizar: ${updateError.message}`
          });
          erros++;
        } else {
          resultados.push({
            email: emailLower,
            status: 'sucesso',
            mensagem: 'Premium ativado!',
            ja_era_premium: user.premium === true
          });
          sucessos++;
        }

      } catch (error) {
        resultados.push({
          email: email,
          status: 'erro',
          mensagem: error.message
        });
        erros++;
      }
    }

    console.log(`✅ Processamento concluído: ${sucessos} sucessos, ${erros} erros, ${naoEncontrados} não encontrados`);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: true,
        total: emails.length,
        sucessos,
        erros,
        naoEncontrados,
        resultados,
        timestamp: new Date().toISOString()
      })
    };

  } catch (error) {
    console.error('❌ Erro ao processar lote:', error);

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
