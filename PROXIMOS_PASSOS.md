# ✅ Arquivo .env Criado! Próximos Passos

## ✅ O QUE JÁ FOI FEITO
✅ Conta criada no Supabase  
✅ Projeto criado no Supabase  
✅ Chaves copiadas  
✅ Arquivo .env criado com suas chaves!  

---

## 🗄️ PASSO 1: Criar as Tabelas no Banco de Dados

Agora precisamos criar as "gavetas" onde vamos guardar os dados!

### Onde fazer?

1. **No dashboard do Supabase**, procure no menu lateral por:
   - **"SQL Editor"** (ícone de banco de dados 📊)
   - OU **"Editor SQL"** (em português)

2. **Clique nele!**

### O que fazer?

1. Você verá uma tela com um editor de texto grande
2. Procure o botão **"New query"** ou **"Nova consulta"**
3. **Clique nele!**
4. Você verá uma caixa de texto grande (como um bloco de notas)

### Copiar o código SQL

1. **Copie TODO o código abaixo** (Ctrl + A, Ctrl + C):

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

2. **Cole na caixa de texto do SQL Editor** (Ctrl + V)

3. **Execute o código:**
   - Procure o botão **"Run"** ou **"Execute"** ou **"Executar"**
   - OU pressione **Ctrl + Enter**
   
4. ⏳ **Aguarde alguns segundos**

5. ✅ **Você deve ver**: Uma mensagem verde dizendo **"Success. No rows returned"**

**🎉 Pronto! As tabelas foram criadas!**

---

## 🔄 PASSO 2: Reiniciar o Programa

Agora vamos reiniciar o programa para que ele reconheça o Supabase!

### Onde fazer?

1. Volte para o terminal (onde você rodou `npm start`)

2. **Parar o programa** (se estiver rodando):
   - Pressione **Ctrl + C**
   - Se perguntar algo, digite **Y** e pressione Enter

3. **Iniciar o programa novamente**:
   ```bash
   npm start
   ```
   - Pressione Enter
   - Aguarde alguns segundos

4. O navegador vai abrir automaticamente! 🌐

---

## ✅ PASSO 3: Verificar se Está Funcionando

Agora vamos ver se tudo está funcionando!

### 1. Abrir o Console do Navegador

1. Com o programa aberto no navegador
2. Pressione **F12** (ou clique com botão direito > "Inspecionar")
3. Vá para a aba **"Console"**

### 2. Procurar Mensagens

Você deve ver uma dessas mensagens:
- ✅ **"✅ Supabase configurado e conectado!"**
- OU
- ✅ **"✅ Usando Supabase como sistema de autenticação"**

**Se você ver essas mensagens, PARABÉNS! 🎉 Tudo está funcionando!**

### 3. Testar Criar uma Conta

1. No programa, clique em **"Cadastre-se aqui"** ou **"Novo Usuário"**
2. Digite um email (exemplo: `teste@teste.com`)
3. Digite uma senha (exemplo: `123456`)
4. Clique em **"Criar Conta"**
5. Se funcionar, você verá uma mensagem de sucesso! ✅

### 4. Verificar no Supabase

1. Volte para o site do Supabase (https://app.supabase.com)
2. Vá para o seu projeto
3. No lado esquerdo, clique em **"Authentication"** (Autenticação)
4. Depois clique em **"Users"** (Usuários)
5. Você deve ver o usuário que você criou! 🎉

---

## 🎊 PRONTO! Está Configurado!

Agora o seu programa está salvando tudo no Supabase (na nuvem)! 🌐

---

## 🆘 Se Algo Der Errado

### ❌ Console mostra: "Supabase não está configurado"
- ✅ Verifique se o arquivo `.env` está na pasta certa (mesma pasta do `package.json`)
- ✅ Verifique se não tem espaços antes ou depois do `=`
- ✅ Reinicie o servidor (`npm start`)

### ❌ Erro ao criar usuário: "User already registered"
- ✅ Isso significa que o email já existe
- ✅ Tente usar outro email ou fazer login

### ❌ Erro: "relation does not exist"
- ✅ Volte no Passo 1 e execute o SQL novamente

---

## 📝 RESUMO DO QUE FAZER AGORA

1. ✅ Vá no Supabase → SQL Editor → New query
2. ✅ Cole o código SQL acima
3. ✅ Clique em Run/Execute
4. ✅ Volte no terminal → Pare o programa (Ctrl + C)
5. ✅ Inicie novamente (`npm start`)
6. ✅ Teste criar uma conta
7. ✅ Verifique no Supabase se o usuário foi criado

**👉 Vá fazer isso agora e me avise quando terminar!** 🚀
