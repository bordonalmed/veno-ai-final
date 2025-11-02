# 🎮 Como Configurar o Supabase - Guia Super Fácil!

## 🎯 O que vamos fazer?

Vamos fazer com que o seu programa salve os usuários e dados em um lugar na internet (nuvem), ao invés de salvar só no seu computador. Assim, os dados estarão seguros na internet! 🌐

---

## 📝 Passo 1: Criar uma Conta no Supabase

### 1.1 - Abrir o site do Supabase

1. Abra seu navegador (Chrome, Firefox, Edge, etc.)
2. Vá para este endereço: **https://supabase.com**
3. Você verá uma página com um botão verde grande

### 1.2 - Criar a conta

1. Clique no botão que diz **"Start your project"** ou **"Sign up"**
2. Você pode criar conta de 3 formas:
   - 🟢 **Com Google** (mais fácil!)
   - 🟣 **Com GitHub** (se você tem conta lá)
   - 📧 **Com Email** (digite seu email e senha)

**💡 Dica**: Se você tem Gmail, use "Com Google" que é mais rápido!

### 1.3 - Confirmar email (se usar email)

1. Se você usou email, vai receber um email do Supabase
2. Abra seu email
3. Clique no link que está dentro do email
4. Pronto! Sua conta está criada! ✅

---

## 📦 Passo 2: Criar um Projeto

### 2.1 - Entrar no Dashboard

1. Depois de criar a conta, você vai entrar em uma página chamada **Dashboard**
2. Você vai ver um botão grande dizendo **"New Project"** ou **"Create Project"**
3. Clique nele! 🖱️

### 2.2 - Preencher os dados do projeto

Agora você vai preencher um formulário. Não se preocupe, é fácil!

**Campo 1 - Name (Nome do Projeto)**:
- Digite: `venoai` (ou qualquer nome que você quiser)
- Exemplo: `meu-projeto-venoai`

**Campo 2 - Database Password (Senha do Banco)**:
- ⚠️ **IMPORTANTE**: Crie uma senha forte e anote em um lugar seguro!
- Exemplo: `MinhaSenh@12345!`
- Anote essa senha! Você pode precisar dela depois! 📝

**Campo 3 - Region (Região)**:
- Escolha: **South America (São Paulo)** 🇧🇷
- (Se você está no Brasil, escolha essa opção)

**Campo 4 - Pricing Plan (Plano)**:
- Escolha: **Free** (Gratuito) 💰
- Não precisa pagar nada!

### 2.3 - Criar o projeto

1. Depois de preencher tudo, clique no botão **"Create new project"**
2. Aguarde 1-2 minutos (é como fazer um sanduíche, precisa esperar um pouco!)
3. ⏳ Você verá uma tela de "loading" (carregando)
4. Quando terminar, você vai ver o Dashboard do seu projeto! ✅

---

## 🔑 Passo 3: Pegar as "Chaves" do Supabase

Pense que você precisa de 2 "chaves" para abrir a porta do Supabase:

### 3.1 - Encontrar as Configurações

1. No lado esquerdo da tela, você verá um ícone de **⚙️ Settings** (ou "Configurações")
2. Clique nele!

### 3.2 - Ir para a área de API

1. Você verá várias opções, procure por **"API"**
2. Clique em **"API"**
3. Você vai ver duas coisas importantes:

### 3.3 - Copiar as informações

**📋 Primeira Chave - Project URL:**
- Você verá algo assim: `https://xxxxx.supabase.co`
- Ao lado dessa URL tem um botão de **copiar** (ícone de 2 folhas de papel 📋)
- Clique no botão de copiar!

**📋 Segunda Chave - anon public key:**
- Você verá uma chave MUITO LONGA que começa com `eyJ...`
- Também tem um botão de copiar ao lado
- Clique no botão de copiar!

**💡 Dica**: Anote essas duas informações em um bloco de notas ou papel. Você vai precisar delas agora!

---

## 💻 Passo 4: Colocar as Chaves no Seu Programa

Agora vamos colocar essas chaves no seu programa para que ele saiba como se conectar ao Supabase!

### 4.1 - Encontrar a pasta do projeto

1. Abra o explorador de arquivos do Windows
2. Vá até a pasta do seu projeto: `C:\Users\vascu\Downloads\venoai\veno-ai-final`
3. Você deve ver vários arquivos e pastas

### 4.2 - Criar o arquivo `.env`

1. Na pasta do projeto (a mesma pasta onde está o arquivo `package.json`), clique com o botão direito
2. Vá em **"Novo"** > **"Documento de Texto"**
3. O nome do arquivo DEVE ser exatamente: `.env` (com ponto na frente!)
4. ⚠️ **IMPORTANTE**: Se o Windows perguntar sobre extensão, escolha "Todos os arquivos"

**💡 Dica**: Se você não conseguir criar um arquivo começando com ponto:
- Crie um arquivo normal chamado `env.txt`
- Depois renomeie para `.env` (sem o `.txt`)

### 4.3 - Escrever as chaves no arquivo

1. Abra o arquivo `.env` com o Bloco de Notas (clique duas vezes nele)
2. Escreva exatamente isso (uma linha por vez):

```
REACT_APP_SUPABASE_URL=cole-aqui-a-project-url-que-voce-copiou
REACT_APP_SUPABASE_ANON_KEY=cole-aqui-a-anon-key-que-voce-copiou
```

**Exemplo de como deve ficar:**
```
REACT_APP_SUPABASE_URL=https://abcdefghijk.supabase.co
REACT_APP_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprIiwicm9sZSI6ImFub24iLCJpYXQiOjE2NDU2Nzg5MDAsImV4cCI6MTk2MTI1NDkwMH0.exemplo-chave-bem-grande-aqui
```

3. **Substitua** o texto depois do `=` pelas informações que você copiou!
4. Salve o arquivo (Ctrl + S ou Arquivo > Salvar)

**⚠️ IMPORTANTE**: 
- Não coloque espaços antes ou depois do `=`
- Não coloque aspas (`"`) ou vírgulas
- Cada linha deve ter uma informação

---

## 🗄️ Passo 5: Criar as Tabelas no Banco de Dados

Pense nas tabelas como "gavetas" onde vamos guardar as informações. Precisamos criar essas gavetas!

### 5.1 - Abrir o SQL Editor

1. No dashboard do Supabase (aquela tela do seu projeto)
2. No lado esquerdo, procure por **"SQL Editor"** (ícone de um banco de dados 📊)
3. Clique nele!

### 5.2 - Criar uma nova query

1. Você verá um botão **"New query"** (Nova consulta)
2. Clique nele!
3. Você verá uma caixa de texto grande (como um bloco de notas)

### 5.3 - Colar o código SQL

1. Copie TODO o código abaixo (Ctrl + A, Ctrl + C):

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

2. Cole na caixa de texto do SQL Editor (Ctrl + V)

### 5.4 - Executar o código

1. Depois de colar, procure por um botão **"Run"** (Rodar) ou **"Execute"** (Executar)
2. Ou pressione **Ctrl + Enter**
3. Aguarde alguns segundos
4. Você deve ver uma mensagem verde dizendo: **"Success. No rows returned"** ✅

**🎉 Pronto!** As tabelas foram criadas!

---

## 🔄 Passo 6: Reiniciar o Programa

Agora vamos reiniciar o programa para que ele reconheça o Supabase!

### 6.1 - Parar o programa (se estiver rodando)

1. Se o programa estiver rodando (você vê uma janela do navegador aberta), volte para o terminal
2. Pressione **Ctrl + C** para parar o programa
3. Você verá algo como "Terminate batch job? (Y/N)"
4. Digite **Y** e pressione Enter

### 6.2 - Iniciar o programa novamente

1. No terminal, digite:
   ```
   npm start
   ```
2. Pressione Enter
3. Aguarde alguns segundos (o programa está "ligando")
4. O navegador vai abrir automaticamente! 🌐

---

## ✅ Passo 7: Verificar se Está Funcionando

Agora vamos ver se tudo está funcionando!

### 7.1 - Abrir o Console do Navegador

1. Com o programa aberto no navegador
2. Pressione **F12** (ou clique com botão direito > "Inspecionar")
3. Vá para a aba **"Console"** (ou "Console" em português)
4. Você deve ver mensagens aqui!

### 7.2 - Verificar as mensagens

Procure por uma mensagem que diz:
- ✅ **"✅ Supabase configurado e conectado!"** 
- OU
- ✅ **"✅ Usando Supabase como sistema de autenticação"**

**Se você ver essas mensagens, PARABÉNS! 🎉 Tudo está funcionando!**

Se você ver:
- ⚠️ **"⚠️ Supabase não configurado"**
- Volte e verifique se o arquivo `.env` está correto!

### 7.3 - Testar Criar uma Conta

1. No programa, clique em **"Cadastre-se aqui"** ou **"Novo Usuário"**
2. Digite um email (exemplo: `teste@teste.com`)
3. Digite uma senha (exemplo: `123456`)
4. Clique em **"Criar Conta"**
5. Se funcionar, você vai ver uma mensagem de sucesso! ✅

### 7.4 - Verificar no Supabase

1. Volte para o site do Supabase (https://app.supabase.com)
2. Vá para o seu projeto
3. No lado esquerdo, clique em **"Authentication"** (Autenticação)
4. Depois clique em **"Users"** (Usuários)
5. Você deve ver o usuário que você criou! 🎉

---

## 🎊 Pronto! Está Configurado!

Agora o seu programa está salvando tudo no Supabase (na nuvem)! 🌐

## 🆘 Se algo der errado...

### ❌ "Supabase não está configurado"
- Verifique se o arquivo `.env` está na pasta certa (mesma pasta do `package.json`)
- Verifique se não tem espaços antes ou depois do `=`
- Verifique se você escreveu corretamente: `REACT_APP_SUPABASE_URL` e `REACT_APP_SUPABASE_ANON_KEY`

### ❌ "Invalid API key"
- Verifique se você copiou a chave completa (ela é bem grande!)
- Não deve ter espaços na chave

### ❌ "relation does not exist"
- Volte no Passo 5 e execute o SQL novamente

### ❌ Erro ao criar usuário: "User already registered"
- Isso significa que o email já existe
- Tente usar outro email ou fazer login

## 💡 Dicas Finais

- ✅ Guarde suas senhas em um lugar seguro
- ✅ O arquivo `.env` não deve ser compartilhado com ninguém!
- ✅ Se você apagar o projeto no Supabase, todos os dados serão perdidos
- ✅ O plano Free (gratuito) tem limite de uso, mas é suficiente para começar!

---

**🎉 Parabéns! Você configurou o Supabase! 🎉**

Se precisar de ajuda, volte aqui e leia novamente com calma! 📚

