-- ============================================
-- SCRIPT SQL CORRIGIDO - SUPABASE
-- Remove políticas existentes antes de criar
-- ============================================

-- ============================================
-- TABELA DE USUÁRIOS
-- ============================================

-- Criar tabela (se não existir)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  nome TEXT,
  data_cadastro TIMESTAMP DEFAULT NOW(),
  plano TEXT DEFAULT 'trial',
  premium BOOLEAN DEFAULT FALSE,
  trial_ativo BOOLEAN DEFAULT TRUE,
  trial_inicio TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Habilitar Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Remover políticas existentes (se existirem)
DROP POLICY IF EXISTS "Users can read own data" ON users;
DROP POLICY IF EXISTS "Users can update own data" ON users;
DROP POLICY IF EXISTS "Users can insert own data" ON users;

-- Criar políticas novamente
CREATE POLICY "Users can read own data" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own data" ON users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own data" ON users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- ============================================
-- TABELA DE LAUDOS (EXAMES)
-- ============================================

-- Criar tabela (se não existir)
CREATE TABLE IF NOT EXISTS laudos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email TEXT,
  tipo_nome TEXT,
  nome TEXT,
  data TEXT,
  tipo_exame TEXT,
  dados JSONB,
  data_criacao TIMESTAMP DEFAULT NOW(),
  data_modificacao TIMESTAMP DEFAULT NOW(),
  origem TEXT DEFAULT 'supabase'
);

-- Habilitar RLS na tabela de laudos
ALTER TABLE laudos ENABLE ROW LEVEL SECURITY;

-- Remover políticas existentes (se existirem)
DROP POLICY IF EXISTS "Users can read own laudos" ON laudos;
DROP POLICY IF EXISTS "Users can insert own laudos" ON laudos;
DROP POLICY IF EXISTS "Users can update own laudos" ON laudos;
DROP POLICY IF EXISTS "Users can delete own laudos" ON laudos;

-- Criar políticas novamente
CREATE POLICY "Users can read own laudos" ON laudos
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own laudos" ON laudos
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own laudos" ON laudos
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own laudos" ON laudos
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- MENSAGEM DE SUCESSO
-- ============================================
SELECT '✅ Tabelas e políticas criadas/atualizadas com sucesso!' AS resultado;
