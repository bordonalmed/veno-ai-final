-- ============================================
-- ATUALIZAR USUÁRIOS PREMIUM DO HOTMART
-- ============================================
-- Este script atualiza usuários para Premium no Supabase
-- Use este script para atualizar múltiplos usuários de uma vez

-- IMPORTANTE: Substitua os emails abaixo pelos emails dos usuários que pagaram no Hotmart
-- ============================================

-- Lista de emails dos usuários que assinaram no Hotmart
-- ADICIONE AQUI OS EMAILS DOS SEUS CLIENTES QUE PAGARAM:
WITH usuarios_premium AS (
  SELECT unnest(ARRAY[
    'email1@exemplo.com',
    'email2@exemplo.com',
    'email3@exemplo.com'
    -- ADICIONE MAIS EMAILS AQUI, UM POR LINHA:
    -- 'email4@exemplo.com',
    -- 'email5@exemplo.com',
  ]) AS email
)

-- Atualizar usuários existentes
UPDATE users
SET 
  premium = true,
  plano = 'premium',
  trial_ativo = false,
  updated_at = NOW()
FROM usuarios_premium
WHERE LOWER(users.email) = LOWER(usuarios_premium.email);

-- Verificar quantos foram atualizados
SELECT 
  COUNT(*) AS total_atualizados,
  'Usuários atualizados para Premium' AS mensagem
FROM users
WHERE premium = true;

-- ============================================
-- COMO USAR ESTE SCRIPT:
-- ============================================
-- 1. Abra o Supabase Dashboard
-- 2. Vá em SQL Editor
-- 3. Copie este script
-- 4. Substitua os emails de exemplo pelos emails reais
-- 5. Execute o script
-- 6. Verifique quantos usuários foram atualizados
-- ============================================

-- ============================================
-- ALTERNATIVA: Atualizar um usuário por vez
-- ============================================
-- Se preferir atualizar manualmente, use este comando:

-- UPDATE users
-- SET 
--   premium = true,
--   plano = 'premium',
--   trial_ativo = false,
--   updated_at = NOW()
-- WHERE LOWER(email) = LOWER('email-do-cliente@exemplo.com');

-- ============================================
-- Verificar usuários Premium
-- ============================================
-- Use este comando para ver todos os usuários Premium:

-- SELECT email, nome, premium, plano, data_cadastro, updated_at
-- FROM users
-- WHERE premium = true
-- ORDER BY updated_at DESC;

