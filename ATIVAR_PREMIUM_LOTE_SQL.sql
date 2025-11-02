-- ============================================
-- ATIVAR PREMIUM EM LOTE PARA USUÁRIOS QUE JÁ PAGARAM
-- ============================================
-- Use este script para ativar Premium para múltiplos usuários de uma vez
-- 
-- INSTRUÇÕES:
-- 1. Substitua os emails abaixo pelos emails dos seus clientes que pagaram
-- 2. Cole no Supabase SQL Editor
-- 3. Execute!
-- ============================================

-- LISTA DE EMAILS DOS USUÁRIOS QUE JÁ PAGARAM NO HOTMART
-- ADICIONE OS EMAILS DOS SEUS CLIENTES AQUI:
WITH usuarios_premium AS (
  SELECT unnest(ARRAY[
    -- COLE AQUI OS EMAILS DOS CLIENTES QUE JÁ PAGARAM:
    'cliente1@email.com',
    'cliente2@email.com',
    'cliente3@email.com'
    -- ADICIONE MAIS EMAILS AQUI, UM POR LINHA:
    -- 'cliente4@email.com',
    -- 'cliente5@email.com',
  ]) AS email
)

-- ATUALIZAR USUÁRIOS PARA PREMIUM
UPDATE users
SET 
  premium = true,
  plano = 'premium',
  trial_ativo = false,
  updated_at = NOW()
FROM usuarios_premium
WHERE LOWER(users.email) = LOWER(usuarios_premium.email);

-- ============================================
-- VERIFICAR RESULTADOS
-- ============================================
-- Execute esta query para ver quantos foram atualizados:

SELECT 
  COUNT(*) AS total_atualizados,
  'Usuários atualizados para Premium' AS mensagem
FROM users
WHERE premium = true;

-- ============================================
-- LISTAR TODOS OS USUÁRIOS PREMIUM
-- ============================================
-- Execute esta query para ver todos os Premium:

SELECT 
  email, 
  nome, 
  premium, 
  plano, 
  data_cadastro, 
  updated_at
FROM users
WHERE premium = true
ORDER BY updated_at DESC;

-- ============================================
-- ATUALIZAR UM USUÁRIO ESPECÍFICO (OPCIONAL)
-- ============================================
-- Se preferir atualizar um por vez:

-- UPDATE users
-- SET 
--   premium = true,
--   plano = 'premium',
--   trial_ativo = false,
--   updated_at = NOW()
-- WHERE LOWER(email) = LOWER('email-do-cliente@exemplo.com');

-- ============================================
-- COMO USAR:
-- ============================================
-- 1. Acesse: https://app.supabase.com
-- 2. Vá em: SQL Editor
-- 3. Clique em: New query
-- 4. Cole este script (substitua os emails)
-- 5. Clique em: Run
-- 6. Verifique os resultados ✅
-- ============================================

