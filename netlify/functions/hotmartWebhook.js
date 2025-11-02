// Webhook do Hotmart para ativar Premium automaticamente no Supabase
const { createClient } = require('@supabase/supabase-js');

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
  const HOTMART_WEBHOOK_SECRET = process.env.HOTMART_WEBHOOK_SECRET;

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

    // Validar HMAC se secret estiver configurado
    if (HOTMART_WEBHOOK_SECRET) {
      const hmacHeader = event.headers['x-hotmart-hmac-sha256'];
      // TODO: Validar HMAC aqui se necessário
      // Por enquanto, vamos processar mesmo sem validação HMAC
      console.log('⚠️ [WEBHOOK] HMAC validation skipped (not implemented)');
    }

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
      console.warn('⚠️ [WEBHOOK] Usuário não encontrado e sem external_reference');
      return {
        statusCode: 404,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          error: 'Usuário não encontrado. Cliente precisa se cadastrar primeiro.',
          success: false,
          email: buyer_email,
          solucao: 'Cliente deve fazer cadastro no site primeiro, depois fazer login após pagamento.'
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
