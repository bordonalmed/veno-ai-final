# 🚀 Guia Completo - Configurar Supabase para VENO.AI

## 📋 O que foi feito

✅ **Biblioteca instalada**: `@supabase/supabase-js`  
✅ **Código atualizado**: Serviço de autenticação pronto para usar Supabase  
✅ **Fallback configurado**: Sistema continua funcionando com localStorage até você configurar

## 🎯 Passo a Passo - Configurar Supabase (10 minutos)

### **Passo 1: Criar Conta no Supabase**

1. Acesse: **https://supabase.com**
2. Clique em **"Start your project"** ou **"Sign up"**
3. Escolha uma forma de login (GitHub, Google, Email, etc.)
4. Confirme seu email se necessário

### **Passo 2: Criar Novo Projeto**

1. No dashboard, clique em **"New Project"**
2. Preencha os dados:
   - **Name**: `venoai` (ou o nome que preferir)
   - **Database Password**: ⚠️ **Crie uma senha forte e anote!** Você precisará dela depois
   - **Region**: Escolha a mais próxima (ex: `South America (São Paulo)`)
   - **Pricing Plan**: Selecione **Free** (plano gratuito)
3. Clique em **"Create new project"**
4. ⏳ Aguarde 1-2 minutos (o banco está sendo criado)

### **Passo 3: Obter Credenciais**

1. No dashboard do seu projeto, clique no ícone de **⚙️ Settings** (canto inferior esquerdo)
2. Vá em **Settings** > **API**
3. Você verá duas informações importantes:
   - **Project URL**: Algo como `https://xxxxx.supabase.co`
   - **anon public key**: Uma chave longa que começa com `eyJ...`

**📝 Copie essas duas informações!**

### **Passo 4: Configurar no Projeto**

1. **Crie arquivo `.env`** na raiz do projeto (mesmo nível do `package.json`)

2. **Adicione essas linhas** no arquivo `.env`:
   ```
   REACT_APP_SUPABASE_URL=https://seu-projeto.supabase.co
   REACT_APP_SUPABASE_ANON_KEY=sua-chave-anon-aqui
   ```

3. **Substitua** os valores:
   - `https://seu-projeto.supabase.co` → Cole sua **Project URL**
   - `sua-chave-anon-aqui` → Cole sua **anon public key**

4. **Salve o arquivo** `.env`

**⚠️ IMPORTANTE**: O arquivo `.env` deve estar na **raiz do projeto**, não dentro de `src/`!

### **Passo 5: Criar Tabelas no Banco de Dados**

1. No dashboard do Supabase, vá em **SQL Editor** (ícone de banco de dados no menu lateral)

2. Clique em **"New query"**

3. **Cole este SQL** e clique em **"Run"**:

```sql
-- Tabela de usuários
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

-- Tabela de laudos (para armazenar exames)
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

4. ✅ Você deve ver: **"Success. No rows returned"**

### **Passo 6: Configurar Autenticação**

1. No Supabase, vá em **Authentication** > **Providers**
2. **Email** já está habilitado por padrão ✅
3. (Opcional) Configure outros provedores se quiser (Google, GitHub, etc.)

### **Passo 7: Reiniciar o Servidor**

1. **Pare o servidor** se estiver rodando (Ctrl+C)
2. Execute: `npm start`
3. O programa deve detectar o Supabase automaticamente!

## ✅ Verificar se está funcionando

1. Abra o console do navegador (F12)
2. Você deve ver: **"✅ Supabase configurado e conectado!"**
3. Teste criar uma conta na tela de login
4. No dashboard do Supabase, vá em:
   - **Authentication** > **Users** → Deve aparecer o usuário criado
   - **Table Editor** > **users** → Deve aparecer o perfil do usuário

## 🐛 Problemas Comuns

### ❌ Erro: "Supabase não está configurado"
- ✅ Verifique se o arquivo `.env` está na **raiz do projeto**
- ✅ Verifique se as variáveis começam com `REACT_APP_`
- ✅ Reinicie o servidor após criar o `.env`

### ❌ Erro: "Invalid API key"
- ✅ Verifique se copiou a chave **anon public** correta
- ✅ Não deve ter espaços antes ou depois da chave

### ❌ Erro ao criar usuário: "User already registered"
- ✅ Este email já foi cadastrado antes
- ✅ Tente fazer login ou use outro email

### ❌ Erro: "relation does not exist"
- ✅ Execute o SQL das tabelas novamente (Passo 5)

## 📊 Estrutura do Banco de Dados

### Tabela `users`
- Armazena informações dos usuários
- Vinculada ao `auth.users` do Supabase
- Campos: email, nome, plano, premium, trial, etc.

### Tabela `laudos`
- Armazena os exames/laudos criados
- Vinculada ao usuário
- Campos: tipo_exame, dados (JSON), datas, etc.

## 🔒 Segurança

✅ **Row Level Security (RLS)** está habilitado  
✅ Usuários só podem acessar seus próprios dados  
✅ Senhas são criptografadas pelo Supabase  
✅ Conexão segura (HTTPS)

## 📝 Próximos Passos (Opcional)

Depois de configurar o Supabase, você pode:
- Migrar os serviços de laudos para usar Supabase
- Configurar sincronização em tempo real
- Adicionar backup automático
- Configurar notificações por email

## 🆘 Precisa de Ajuda?

- Documentação Supabase: https://supabase.com/docs
- Dashboard: https://app.supabase.com
- Comunidade: https://github.com/supabase/supabase

---

**Status**: ⏳ Aguardando configuração do Supabase  
**Próximo**: Configure o `.env` e crie as tabelas!
