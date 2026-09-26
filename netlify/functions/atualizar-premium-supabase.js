// Função para atualizar status Premium no Supabase
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

  const { email, acao } = event.queryStringParameters || {};

  // Pegar variáveis de ambiente do Supabase
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
        error: 'Supabase não configurado. Configure SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no Netlify.',
        success: false
      })
    };
  }

  // Criar cliente Supabase com service key (tem acesso total)
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  try {
    if (acao === 'adicionar' || acao === 'ativar') {
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

      console.log(`💎 Ativando Premium para: ${email}`);

      // Buscar usuário diretamente na tabela users pelo email
      const { data: existingUser, error: findError } = await supabase
        .from('users')
        .select('id, email')
        .eq('email', email.toLowerCase())
        .single();

      let userId = null;

      if (findError && findError.code !== 'PGRST116') {
        // Erro diferente de "não encontrado"
        console.error('❌ Erro ao buscar usuário:', findError);
        return {
          statusCode: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          body: JSON.stringify({
            error: 'Erro ao buscar usuário no Supabase',
            success: false,
            details: findError.message
          })
        };
      }

      if (existingUser) {
        userId = existingUser.id;
        console.log(`✅ Usuário encontrado na tabela users: ${userId}`);
      } else {
        // Usuário não encontrado na tabela users
        // Tentar buscar no auth.users usando uma query direta
        console.log(`⚠️ Usuário não encontrado na tabela users, buscando no auth...`);
        
        // Buscar direto pela tabela auth.users (requer privilégios de admin)
        // Como alternativa, vamos atualizar/criar direto pelo email na tabela users
        // Mas primeiro precisamos do ID do auth.users
        // Por enquanto, vamos tentar criar/atualizar e deixar o Supabase resolver
        
        return {
          statusCode: 404,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          body: JSON.stringify({
            error: 'Usuário não encontrado. O usuário precisa se cadastrar e fazer login primeiro para criar o perfil na tabela users.',
            success: false,
            email: email,
            solucao: 'Peça ao usuário para fazer login no sistema primeiro, depois tente ativar o Premium novamente.'
          })
        };
      }

      // Atualizar tabela users com premium = true
      const { data: updateData, error: updateError } = await supabase
        .from('users')
        .update({
          premium: true,
          plano: 'premium',
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select();

      if (updateError) {
        // Se não encontrar na tabela users, criar registro
        if (updateError.code === 'PGRST116' || updateError.message.includes('No rows')) {
          console.log('📝 Usuário não encontrado na tabela users, criando registro...');
          
          const { data: insertData, error: insertError } = await supabase
            .from('users')
            .insert({
              id: userId,
              email: email.toLowerCase(),
              nome: email.split('@')[0],
              premium: true,
              plano: 'premium',
              trial_ativo: false,
              data_cadastro: new Date().toISOString(),
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .select();

          if (insertError) {
            console.error('❌ Erro ao criar registro:', insertError);
            return {
              statusCode: 500,
              headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
              },
              body: JSON.stringify({
                error: 'Erro ao criar registro do usuário',
                success: false,
                details: insertError.message
              })
            };
          }

          console.log('✅ Usuário Premium criado no Supabase:', insertData);
          
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
              acao: 'ativado',
              mensagem: 'Usuário Premium ativado no Supabase com sucesso!',
              timestamp: new Date().toISOString()
            })
          };
        }

        console.error('❌ Erro ao atualizar usuário:', updateError);
        return {
          statusCode: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          body: JSON.stringify({
            error: 'Erro ao atualizar usuário no Supabase',
            success: false,
            details: updateError.message
          })
        };
      }

      console.log('✅ Usuário Premium atualizado no Supabase:', updateData);

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
          acao: 'ativado',
          mensagem: 'Usuário Premium ativado no Supabase com sucesso!',
          timestamp: new Date().toISOString()
        })
      };
    }

    if (acao === 'verificar') {
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

      // Buscar usuário no Supabase
      const { data: users, error: selectError } = await supabase
        .from('users')
        .select('email, premium, plano')
        .eq('email', email.toLowerCase())
        .limit(1);

      if (selectError) {
        console.error('❌ Erro ao buscar usuário:', selectError);
        return {
          statusCode: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          body: JSON.stringify({
            error: 'Erro ao buscar usuário no Supabase',
            success: false
          })
        };
      }

      const isPremium = users && users.length > 0 && users[0].premium === true;

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
          mensagem: isPremium ? 'Usuário Premium confirmado!' : 'Usuário Trial',
          timestamp: new Date().toISOString()
        })
      };
    }

    if (acao === 'listar') {
      // Listar todos os usuários premium
      const { data: premiumUsers, error: listError } = await supabase
        .from('users')
        .select('email, premium, plano, nome')
        .eq('premium', true)
        .order('updated_at', { ascending: false });

      if (listError) {
        console.error('❌ Erro ao listar usuários:', listError);
        return {
          statusCode: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          body: JSON.stringify({
            error: 'Erro ao listar usuários premium',
            success: false
          })
        };
      }

      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          success: true,
          usuariosPremium: premiumUsers || [],
          total: premiumUsers?.length || 0,
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
        error: 'Ação não reconhecida. Use: adicionar, ativar, verificar ou listar',
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
        success: false,
        details: error.message
      })
    };
  }
};
