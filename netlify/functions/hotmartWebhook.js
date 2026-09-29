// Webhook do Hotmart para ativar Premium automaticamente no Supabase
const { createClient } = require('@supabase/supabase-js');
const { timingSafeEqualStr } = require('./_shared/adminAuth');

exports.handler = async (event, context) => {
  // Permitir CORS
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: ''
    };
  }

  // Verificar se é POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        error: 'Method not allowed',
        success: false
      })
    };
  }

  // Pegar variáveis de ambiente
  const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL || process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  // Token único da sua conta Hotmart (aba Webhook > Autenticação, no painel da Hotmart)
  const HOTMART_HOTTOK = process.env.HOTMART_HOTTOK || process.env.HOTMART_WEBHOOK_SECRET;

  if (!HOTMART_HOTTOK) {
    console.error('❌ [WEBHOOK] HOTMART_HOTTOK não configurado - recusando requisição por segurança');
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        error: 'Webhook não configurado: defina HOTMART_HOTTOK (o token da aba Webhook > Autenticação no painel Hotmart) nas variáveis de ambiente do Netlify.',
        success: false
      })
    };
  }

  // Validar o Hottok enviado pela Hotmart no header (nunca processar sem essa checagem)
  const hottokRecebido = event.headers['x-hotmart-hottok'] || event.headers['X-Hotmart-Hottok'];
  if (!hottokRecebido || !timingSafeEqualStr(hottokRecebido, HOTMART_HOTTOK)) {
    console.error('❌ [WEBHOOK] Hottok inválido ou ausente - requisição rejeitada');
    return {
      statusCode: 401,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        error: 'Assinatura inválida',
        success: false
      })
    };
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('❌ Supabase não configurado');
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

  // Criar cliente Supabase
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  try {
    // Parse do webhook
    const webhookData = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    const { event: webhookEvent, data } = webhookData;

    console.log('📨 [WEBHOOK] Evento recebido:', webhookEvent);
    console.log('📦 [WEBHOOK] Dados:', JSON.stringify(data, null, 2));

    // Extrair dados do webhook
    const {
      buyer_email,
      purchase_transaction_id,
      subscription_status,
      external_reference, // ID do usuário (se passado no checkout)
      product,
      purchase_date,
      warranty_date
    } = data;

    console.log('🔍 [WEBHOOK] Dados extraídos:', {
      email: buyer_email,
      transactionId: purchase_transaction_id,
      externalReference: external_reference,
      subscriptionStatus: subscription_status
    });

    // Determinar se deve ativar Premium
    const shouldActivatePremium = 
      webhookEvent === 'PURCHASE_APPROVED' || 
      (webhookEvent === 'PURCHASE_COMPLETE' && subscription_status === 'ACTIVE');

    console.log('💎 [WEBHOOK] Deve ativar Premium?', shouldActivatePremium);

    if (!shouldActivatePremium) {
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          success: true,
          message: 'Evento processado, mas não requer ativação de Premium',
          event: webhookEvent
        })
      };
    }

    if (!buyer_email) {
      console.error('❌ [WEBHOOK] Email do comprador não fornecido');
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          error: 'Email do comprador não fornecido',
          success: false
        })
      };
    }

    // Buscar usuário pelo email na tabela users
    const { data: existingUser, error: findError } = await supabase
      .from('users')
      .select('id, email, premium')
      .eq('email', buyer_email.toLowerCase())
      .single();

    if (findError && findError.code !== 'PGRST116') {
      console.error('❌ [WEBHOOK] Erro ao buscar usuário:', findError);
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

    // Se usuário não existe, criar ou retornar erro
    let userId = existingUser?.id;

    if (!userId && external_reference) {
      // Se tem external_reference (UID), usar ele
      userId = external_reference;
      console.log('📝 [WEBHOOK] Usando external_reference como ID:', userId);
      
      // Tentar criar registro se não existir
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert({
          id: userId,
          email: buyer_email.toLowerCase(),
          nome: buyer_email.split('@')[0],
          premium: true,
          plano: 'premium',
          trial_ativo: false,
          data_cadastro: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select();

      if (createError && !createError.message.includes('duplicate')) {
        console.error('❌ [WEBHOOK] Erro ao criar usuário:', createError);
      } else {
        console.log('✅ [WEBHOOK] Usuário criado com Premium');
      }
    }

    if (!userId) {
      // Usuário não existe ainda - criar automaticamente
      console.log('📝 [WEBHOOK] Usuário não encontrado. Criando automaticamente...');
      
      try {
        // Buscar ou criar usuário no Supabase Auth
        const { data: authUser, error: authError } = await supabase.auth.admin.getUserByEmail(buyer_email.toLowerCase());
        
        let newUserId = null;
        
        if (authError || !authUser?.user) {
          // Usuário não existe no Auth, criar automaticamente
          console.log('📝 [WEBHOOK] Criando usuário no Supabase Auth...');
          
          // Criar usuário no Auth com senha temporária (cliente precisa redefinir no primeiro login)
          const tempPassword = 'TempPass' + Math.random().toString(36).slice(-10) + '!';
          
          const { data: newAuthUser, error: createAuthError } = await supabase.auth.admin.createUser({
            email: buyer_email.toLowerCase(),
            password: tempPassword,
            email_confirm: true, // Confirmar email automaticamente
            user_metadata: {
              origem: 'hotmart',
              created_via: 'webhook'
            }
          });
          
          if (createAuthError || !newAuthUser?.user) {
            console.error('❌ [WEBHOOK] Erro ao criar usuário no Auth:', createAuthError);
            // Continuar mesmo assim, vamos criar registro mínimo na tabela users
          } else {
            newUserId = newAuthUser.user.id;
            console.log('✅ [WEBHOOK] Usuário criado no Supabase Auth:', newUserId);
          }
        } else {
          newUserId = authUser.user.id;
          console.log('✅ [WEBHOOK] Usuário encontrado no Supabase Auth:', newUserId);
        }
        
        if (newUserId) {
          // Criar registro na tabela users com Premium já ativo
          const { data: newUserData, error: createUserError } = await supabase
            .from('users')
            .insert({
              id: newUserId,
              email: buyer_email.toLowerCase(),
              nome: buyer_email.split('@')[0],
              premium: true,
              plano: 'premium',
              trial_ativo: false,
              data_cadastro: new Date().toISOString(),
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .select()
            .single();
          
          if (createUserError && !createUserError.message.includes('duplicate')) {
            console.error('❌ [WEBHOOK] Erro ao criar registro na tabela users:', createUserError);
          } else {
            userId = newUserId;
            console.log('✅ [WEBHOOK] Usuário criado automaticamente com Premium:', buyer_email);
          }
        }
      } catch (createErr) {
        console.error('❌ [WEBHOOK] Erro ao criar usuário automaticamente:', createErr);
      }
    }
    
    if (!userId) {
      console.warn('⚠️ [WEBHOOK] Não foi possível criar usuário automaticamente');
      return {
        statusCode: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          error: 'Erro ao criar usuário automaticamente',
          success: false,
          email: buyer_email,
          solucao: 'Tente criar o usuário manualmente ou aguarde alguns minutos e tente novamente'
        })
      };
    }

    // Atualizar Premium
    const { data: updateData, error: updateError } = await supabase
      .from('users')
      .update({
        premium: true,
        plano: 'premium',
        trial_ativo: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select();

    if (updateError) {
      console.error('❌ [WEBHOOK] Erro ao atualizar Premium:', updateError);
      return {
        statusCode: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          error: 'Erro ao ativar Premium',
          success: false,
          details: updateError.message
        })
      };
    }

    console.log('✅ [WEBHOOK] Premium ativado com sucesso:', {
      email: buyer_email,
      userId: userId,
      transactionId: purchase_transaction_id
    });

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: true,
        message: 'Premium ativado automaticamente',
        email: buyer_email,
        premium: true,
        transactionId: purchase_transaction_id,
        timestamp: new Date().toISOString()
      })
    };

  } catch (error) {
    console.error('❌ [WEBHOOK] Erro ao processar webhook:', error);

    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        error: 'Erro interno ao processar webhook',
        success: false,
        details: error.message
      })
    };
  }
};
