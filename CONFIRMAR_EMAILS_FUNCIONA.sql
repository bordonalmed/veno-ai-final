-- ============================================
-- CONFIRMAR EMAILS - VERSÃO QUE FUNCIONA
-- ============================================
-- Execute UMA LINHA por vez no Supabase SQL Editor

-- PASSO 1: Verificar usuários não confirmados
SELECT 
  id,
  email,
  email_confirmed_at,
  confirmed_at,
  CASE 
    WHEN email_confirmed_at IS NULL THEN '❌ Não confirmado'
    ELSE '✅ Confirmado'
  END AS status
FROM auth.users
ORDER BY created_at DESC;

-- PASSO 2: Confirmar TODOS os usuários (execute apenas esta linha)
UPDATE auth.users
SET email_confirmed_at = NOW(), confirmed_at = NOW()
WHERE email_confirmed_at IS NULL;

-- PASSO 3: Verificar resultado (execute apenas esta linha)
SELECT 
  email,
  email_confirmed_at,
  CASE 
    WHEN email_confirmed_at IS NOT NULL THEN '✅ Confirmado'
    ELSE '❌ Não confirmado'
  END AS status
FROM auth.users;

