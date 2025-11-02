# 📋 Instruções para Configurar Supabase

## Por que Supabase?

O **Supabase** é uma excelente alternativa gratuita ao Firebase:
- ✅ **100% Gratuito** para projetos pequenos/médios
- ✅ Similar ao Firebase (fácil migração)
- ✅ PostgreSQL (banco de dados robusto)
- ✅ Autenticação completa
- ✅ API REST automática
- ✅ Dashboard visual

## 🚀 Como Configurar (5 minutos)

### Passo 1: Criar Conta no Supabase
1. Acesse: https://supabase.com
2. Clique em "Start your project" ou "Sign up"
3. Crie sua conta (pode usar GitHub, Google, etc.)

### Passo 2: Criar Novo Projeto
1. Clique em "New Project"
2. Preencha:
   - **Name**: venoai (ou o nome que preferir)
   - **Database Password**: Crie uma senha forte (anote ela!)
   - **Region**: Escolha a região mais próxima (ex: South America)
3. Clique em "Create new project"
4. ⏳ Aguarde alguns minutos (o banco está sendo criado)

### Passo 3: Obter Credenciais
1. No dashboard do Supabase, vá em **Settings** (⚙️) > **API**
2. Copie:
   - **Project URL** (algo como: `https://xxxxx.supabase.co`)
   - **anon public key** (uma chave longa)

### Passo 4: Configurar no Projeto

1. **Criar arquivo `.env`** na raiz do projeto:
   ```
   REACT_APP_SUPABASE_URL=https://seu-projeto.supabase.co
   REACT_APP_SUPABASE_ANON_KEY=sua-chave-anon-aqui
   ```

2. **Substituir** `seu-projeto.supabase.co` pela URL do seu projeto
3. **Substituir** `sua-chave-anon-aqui` pela chave anônima

4. **Instalar biblioteca Supabase** (se necessário):
   ```bash
   npm install @supabase/supabase-js
   ```

5. **Reiniciar o servidor**:
   ```bash
   npm start
   ```

## 📊 Configurar Tabelas no Banco de Dados

Após criar o projeto, você precisa criar as tabelas necessárias:

1. Vá em **SQL Editor** no dashboard do Supabase
2. Execute este SQL:

```sql
-- Tabela de usuários
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

-- Política: Usuários podem ler e atualizar apenas seus próprios dados
CREATE POLICY "Users can read own data" ON users
  FOR SELECT USING (auth.uid()::text = id::text);

CREATE POLICY "Users can update own data" ON users
  FOR UPDATE USING (auth.uid()::text = id::text);
```

## 🔒 Configurar Autenticação

1. No Supabase, vá em **Authentication** > **Providers**
2. **Email** já está habilitado por padrão ✅
3. Configure outras opções se necessário (Google, GitHub, etc.)

## ✅ Testar

1. Execute o projeto: `npm start`
2. Tente criar uma conta na tela de login
3. Verifique no dashboard do Supabase se o usuário foi criado:
   - **Authentication** > **Users**

## 💡 Nota Importante

**Por enquanto, o sistema está usando localStorage como backup** até você configurar o Supabase. Isso significa que:

- ✅ Funciona imediatamente (sem configuração)
- ✅ Usuários são salvos localmente no navegador
- ⚠️ Dados são perdidos se limpar o cache do navegador

**Após configurar o Supabase, todos os dados serão salvos na nuvem!**

## 📚 Recursos Úteis

- Documentação: https://supabase.com/docs
- Dashboard: https://app.supabase.com
- Comunidade: https://github.com/supabase/supabase

## 🆘 Problemas?

Se tiver problemas:
1. Verifique se o arquivo `.env` está na raiz do projeto
2. Reinicie o servidor após criar o `.env`
3. Verifique se as credenciais estão corretas
4. Veja os logs no console do navegador (F12)

---

**Status Atual**: ✅ Sistema funciona com localStorage (temporário)
**Próximo Passo**: Configurar Supabase seguindo os passos acima


