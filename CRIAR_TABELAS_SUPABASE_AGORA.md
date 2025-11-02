# 🗄️ Criar Tabelas no Supabase - URGENTE!

## ❌ PROBLEMA IDENTIFICADO

**Você cria usuário em um dispositivo, mas não reconhece em outro dispositivo!**

**Causa:**
- Os usuários estão sendo criados no Supabase **Auth** (autenticação) ✅
- Mas a tabela `users` **NÃO existe** no banco de dados ❌
- Por isso o perfil do usuário não é salvo e não sincroniza entre dispositivos!

---

## ✅ SOLUÇÃO: Criar Tabelas no Supabase

### 📋 PASSO 1: Acessar o Supabase

1. Acesse: **https://app.supabase.com**
2. Faça login na sua conta
3. Selecione seu projeto: `qgwirkyslfuftlefvnlu`

### 📋 PASSO 2: Abrir SQL Editor

1. No menu lateral, procure por **"SQL Editor"** (ícone de banco de dados 📊)
2. **Clique nele!**
3. Você verá uma tela com editor de código SQL

### 📋 PASSO 3: Criar Nova Query

1. Clique no botão **"New query"** ou **"Nova consulta"**
2. Você verá uma caixa de texto grande (editor SQL)

### 📋 PASSO 4: Copiar e Colar o SQL

1. **Copie TODO o código SQL abaixo** (Ctrl + A, Ctrl + C):

```sql
-- ============================================
-- TABELA DE USUÁRIOS
-- ============================================
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

-- Política: Usuários podem ler apenas seus próprios dados
CREATE POLICY "Users can read own data" ON users
  FOR SELECT USING (auth.uid() = id);

-- Política: Usuários podem atualizar apenas seus próprios dados
CREATE POLICY "Users can update own data" ON users
  FOR UPDATE USING (auth.uid() = id);

-- Política: Usuários podem inserir apenas seus próprios dados
CREATE POLICY "Users can insert own data" ON users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- ============================================
-- TABELA DE LAUDOS (EXAMES)
-- ============================================
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

-- Política: Usuários podem ler apenas seus próprios laudos
CREATE POLICY "Users can read own laudos" ON laudos
  FOR SELECT USING (auth.uid() = user_id);

-- Política: Usuários podem criar apenas seus próprios laudos
CREATE POLICY "Users can insert own laudos" ON laudos
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Política: Usuários podem atualizar apenas seus próprios laudos
CREATE POLICY "Users can update own laudos" ON laudos
  FOR UPDATE USING (auth.uid() = user_id);

-- Política: Usuários podem deletar apenas seus próprios laudos
CREATE POLICY "Users can delete own laudos" ON laudos
  FOR DELETE USING (auth.uid() = user_id);
```

### 📋 PASSO 5: Executar o SQL

1. **Cole o código** no editor SQL (Ctrl + V)
2. Clique no botão **"Run"** ou **"Executar"** (botão verde, canto inferior direito)
3. Aguarde alguns segundos...
4. Você verá: **"Success. No rows returned"** ou mensagem de sucesso ✅

---

## ✅ PASSO 6: Verificar se Funcionou

### Verificar Tabelas Criadas:

1. No menu lateral do Supabase, clique em **"Table Editor"** (ícone de tabela)
2. Você deve ver 2 tabelas:
   - ✅ `users` (tabela de usuários)
   - ✅ `laudos` (tabela de exames)

### Testar Agora:

1. **Feche e abra o navegador novamente** (importante!)
2. **Crie uma nova conta** no site
3. **Em outro dispositivo ou navegador**, faça login com a mesma conta
4. **Deve funcionar!** ✅

---

## 🔍 Verificar se Já Funcionou

### Como Saber se as Tabelas Foram Criadas:

**✅ FUNCIONANDO:**
- Vá em Table Editor → Você vê as tabelas `users` e `laudos`
- Ao criar usuário, console mostra: `✅ Usuário criado no Supabase`
- Ao fazer login, usuário é reconhecido em qualquer dispositivo
- Dados aparecem em "Table Editor" → `users`

**❌ AINDA COM PROBLEMA:**
- Table Editor não mostra tabelas `users` ou `laudos`
- Ao criar usuário, console mostra erro sobre tabela não encontrada
- Login não funciona em outros dispositivos

---

## 🆘 Se Der Erro ao Executar o SQL

### Erro: "relation already exists"
- **Significa**: As tabelas já existem! ✅
- **Solução**: Está tudo certo! Só precisa testar

### Erro: "permission denied"
- **Causa**: Problemas de permissão
- **Solução**: Verifique se está logado no Supabase correto

### Erro: "syntax error"
- **Causa**: Código SQL mal copiado
- **Solução**: Copie novamente TODO o código acima

---

## 🎯 Depois de Criar as Tabelas

1. **Teste criar uma conta nova** no site
2. **Verifique no Supabase**:
   - Table Editor → `users` → Deve ver o novo usuário
3. **Teste em outro dispositivo**:
   - Abra o site em outro navegador/dispositivo
   - Faça login com a mesma conta
   - **Deve funcionar!** ✅

---

## 📋 Checklist Final

- [ ] Acessei o Supabase
- [ ] Fui em SQL Editor
- [ ] Criei nova query
- [ ] Colei TODO o código SQL
- [ ] Executei o SQL (Run)
- [ ] Vi mensagem de sucesso
- [ ] Verifiquei em Table Editor que as tabelas existem
- [ ] Testei criar conta nova
- [ ] Testei login em outro dispositivo
- [ ] Funcionou! ✅

---

## 🚀 Pronto!

Depois de criar as tabelas, os usuários serão salvos corretamente no Supabase e funcionarão em **qualquer dispositivo**! 

**👉 Execute o SQL agora e me diga se funcionou!** 🎉
