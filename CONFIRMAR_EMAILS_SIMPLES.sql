-- ============================================
-- CONFIRMAR EMAILS - VERSÃO SIMPLES E CORRIGIDA
-- ============================================

-- Opção 1: Confirmar TODOS os usuários que não estão confirmados
-- IMPORTANTE: Use apenas UMA linha por vez (UPDATE ou SELECT)

-- Primeiro, vamos verificar quais usuários precisam ser confirmados:
SELECT 
  id,
  email,
  email_confirmed_at,
  confirmed_at
FROM auth.users
WHERE email_confirmed_at IS NULL OR confirmed_at IS NULL;

-- Depois, use este UPDATE (copie e execute apenas esta parte):
UPDATE auth.users
SET 
  email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
  confirmed_at = COALESCE(confirmed_at, NOW())
WHERE email_confirmed_at IS NULL OR confirmed_at IS NULL;

-- Opção 2: Confirmar APENAS usuários específicos (comente Opção 1 e use esta)
-- UPDATE auth.users
-- SET 
--   email_confirmed_at = NOW(),
--   confirmed_at = NOW()
-- WHERE email = 'vasculargabriel@gmail.com' OR email = 'bordonalmed@yahoo.com.br';

-- Verificar resultado
SELECT 
  email,
  email_confirmed_at,
  CASE 
    WHEN email_confirmed_at IS NOT NULL THEN '✅ Confirmado'
    ELSE '❌ Não confirmado'
  END AS status
FROM auth.users
ORDER BY created_at DESC;

