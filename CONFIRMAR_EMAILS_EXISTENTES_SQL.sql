-- ============================================
-- CONFIRMAR EMAILS EXISTENTES NO SUPABASE
-- ============================================
-- Este script confirma todos os emails de usuários existentes
-- Use isso para confirmar emails de usuários que já foram criados
-- antes de desabilitar a confirmação de email

-- ============================================
-- CONFIRMAR TODOS OS USUÁRIOS EXISTENTES
-- ============================================

-- Confirmar todos os usuários que não estão confirmados
UPDATE auth.users
SET 
  email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
  confirmed_at = COALESCE(confirmed_at, NOW())
WHERE (email_confirmed_at IS NULL) OR (confirmed_at IS NULL);

-- Verificar quantos foram confirmados
SELECT 
  COUNT(*) AS total_confirmados,
  'Usuários confirmados' AS mensagem
FROM auth.users
WHERE email_confirmed_at IS NOT NULL;

-- ============================================
-- CONFIRMAR USUÁRIOS ESPECÍFICOS
-- ============================================
-- Se preferir confirmar apenas usuários específicos, use:

-- Confirmar usuários específicos por email
-- UPDATE auth.users
-- SET 
--   email_confirmed_at = NOW(),
--   confirmed_at = NOW()
-- WHERE email = 'vasculargabriel@gmail.com' OR email = 'bordonalmed@yahoo.com.br';

-- ============================================
-- VERIFICAR STATUS DOS USUÁRIOS
-- ============================================

-- Ver todos os usuários e seu status de confirmação
SELECT 
  email,
  email_confirmed_at,
  confirmed_at,
  CASE 
    WHEN email_confirmed_at IS NOT NULL THEN '✅ Confirmado'
    ELSE '❌ Não confirmado'
  END AS status
FROM auth.users
ORDER BY created_at DESC;

-- ============================================
-- COMO USAR:
-- ============================================
-- 1. Acesse: https://app.supabase.com
-- 2. Vá em: SQL Editor
-- 3. Clique em: New query
-- 4. Cole este script
-- 5. Clique em: Run
-- 6. Verifique os resultados ✅
-- ============================================

