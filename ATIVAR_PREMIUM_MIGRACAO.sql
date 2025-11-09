-- ============================================
-- ATIVAR PREMIUM PARA USUÁRIOS DO HOTMART
-- Use este script para ativar Premium para usuários que pagaram no Hotmart
-- ============================================

-- ============================================
-- PASSO 1: VERIFICAR USUÁRIOS EXISTENTES
-- ============================================
-- Execute primeiro para ver quais usuários existem:

SELECT 
  id,
  email,
  premium,
  plano,
  trial_ativo,
  updated_at
FROM users
ORDER BY created_at DESC;

-- ============================================
-- PASSO 2: ATIVAR PREMIUM PARA USUÁRIOS ESPECÍFICOS
-- ============================================
-- Edite a lista de emails abaixo com os emails dos clientes que pagaram no Hotmart:

UPDATE users
SET 
  premium = true,
  plano = 'premium',
  trial_ativo = false,
  updated_at = NOW()
WHERE LOWER(email) IN (
  LOWER('vasculargabriel@gmail.com'),
  LOWER('bordonalmed@yahoo.com.br'),
  -- ADICIONE MAIS EMAILS AQUI:
  -- LOWER('cliente1@email.com'),
  -- LOWER('cliente2@email.com'),
  -- LOWER('cliente3@email.com'),
);

-- ============================================
-- PASSO 3: VERIFICAR RESULTADO
-- ============================================
-- Execute para verificar se os usuários foram ativados:

SELECT 
  email,
  premium,
  plano,
  CASE 
    WHEN premium = true THEN '✅ Premium Ativo'
    ELSE '❌ Trial'
  END AS status,
  updated_at
FROM users
WHERE LOWER(email) IN (
  LOWER('vasculargabriel@gmail.com'),
  LOWER('bordonalmed@yahoo.com.br')
  -- Use a mesma lista do UPDATE acima
)
ORDER BY updated_at DESC;

-- ============================================
-- PASSO 4: LISTAR TODOS OS PREMIUM
-- ============================================
-- Ver todos os usuários Premium:

SELECT 
  email,
  premium,
  plano,
  data_cadastro,
  updated_at
FROM users
WHERE premium = true
ORDER BY updated_at DESC;

-- ============================================
-- PASSO 5: CONTAR PREMIUM VS TRIAL
-- ============================================
-- Estatísticas:

SELECT 
  COUNT(*) FILTER (WHERE premium = true) AS total_premium,
  COUNT(*) FILTER (WHERE premium = false) AS total_trial,
  COUNT(*) AS total_usuarios
FROM users;

-- ============================================
-- COMO USAR:
-- ============================================
-- 1. Acesse: https://app.supabase.com
-- 2. Vá em: SQL Editor
-- 3. Clique em: New query
-- 4. Cole este script
-- 5. Edite a lista de emails no PASSO 2
-- 6. Execute PASSO 1 primeiro (para ver usuários)
-- 7. Execute PASSO 2 (para ativar Premium)
-- 8. Execute PASSO 3 (para verificar resultado)
-- 9. Pronto! ✅
-- ============================================

