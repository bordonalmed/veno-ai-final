# 🔧 Corrigir Erro Supabase no Netlify

## ❌ Erro Identificado

```
mllswskeejivysshbwaq.supabase.co/auth/v1/token
Failed to load resource: net::ERR_NAME_NOT_RESOLVED
```

**Problema:** 
- Está tentando acessar: `mllswskeejivysshbwaq.supabase.co` (ERRADO!)
- Deveria ser: `qgwirkyslfuftlefvnlu.supabase.co` (CORRETO!)

**Causa:** 
- Variáveis de ambiente no Netlify estão com valores errados ou antigos

---

## ✅ SOLUÇÃO: Corrigir Variáveis de Ambiente no Netlify

### Passo 1: Acessar Netlify

1. Acesse: https://app.netlify.com
2. Faça login na sua conta
3. Clique no seu site: `venoai.xyz`

### Passo 2: Ir em Environment Variables

1. Clique em **"Site settings"** (menu lateral ou botão)
2. Vá em **"Environment variables"** (ou "Build & deploy" → "Environment variables")
3. Procure pelas variáveis:
   - `REACT_APP_SUPABASE_URL`
   - `REACT_APP_SUPABASE_ANON_KEY`

### Passo 3: Verificar/Corrigir Variáveis

**Verifique se estão assim:**

**Variável 1 - URL (DEVE SER EXATAMENTE ISTO):**
```
Key: REACT_APP_SUPABASE_URL
Value: https://qgwirkyslfuftlefvnlu.supabase.co
```

**⚠️ IMPORTANTE:** 
- A URL deve ser: `https://qgwirkyslfuftlefvnlu.supabase.co`
- **NÃO** deve ser: `mllswskeejivysshbwaq.supabase.co` (antiga/errada)

**Variável 2 - Chave (DEVE SER EXATAMENTE ISTO):**
```
Key: REACT_APP_SUPABASE_ANON_KEY
Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFnd2lya3lzbGZ1ZnRsZWZ2bmx1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIwNTQ5MDgsImV4cCI6MjA3NzYzMDkwOH0.N49OPDERfdibRF14cSO74H5vxGHGK-5YRglMU43Thtw
```

### Passo 4: Atualizar Variáveis (Se Estiverem Erradas)

Se as variáveis estiverem com valores errados:

1. **Clique na variável** `REACT_APP_SUPABASE_URL`
2. **Edite o Value** para: `https://qgwirkyslfuftlefvnlu.supabase.co`
3. **Salve**
4. **Repita** para `REACT_APP_SUPABASE_ANON_KEY` se necessário

**OU se não existirem:**

1. Clique em **"Add variable"** ou **"New variable"**
2. Adicione as 2 variáveis com os valores corretos acima
3. **Salve**

### Passo 5: Fazer Novo Deploy

Depois de corrigir as variáveis:

1. Vá em **"Deploys"**
2. Clique em **"Trigger deploy"**
3. Escolha **"Deploy project without cache"** ⭐
4. Aguarde 2-5 minutos
5. Teste novamente!

---

## 🔍 Verificar se Está Correto

### Como Saber se Está Funcionando:

**✅ FUNCIONANDO:**
- Console mostra: `✅ Supabase configurado e conectado!`
- Login funciona sem erros
- Cadastro funciona sem erros
- Não aparece `ERR_NAME_NOT_RESOLVED`

**❌ AINDA COM PROBLEMA:**
- Aparece: `mllswskeejivysshbwaq.supabase.co` (URL errada)
- Erro: `ERR_NAME_NOT_RESOLVED`
- Login/cadastro falha

---

## 🆘 Se Ainda Der Erro

### Verificar se o Projeto Supabase Existe

1. Acesse: https://supabase.com
2. Faça login
3. Verifique se o projeto `qgwirkyslfuftlefvnlu` existe
4. Se não existir, precisa criar novo projeto

### Verificar Credenciais Corretas

1. No Supabase, vá em **Settings** → **API**
2. Copie a **Project URL** (deve ser `https://qgwirkyslfuftlefvnlu.supabase.co`)
3. Copie a **anon public** key (chave anônima)
4. Atualize no Netlify com esses valores exatos

---

## 📋 Checklist

- [ ] Acessei o Netlify
- [ ] Fui em "Site settings" → "Environment variables"
- [ ] Verifiquei `REACT_APP_SUPABASE_URL` = `https://qgwirkyslfuftlefvnlu.supabase.co`
- [ ] Verifiquei `REACT_APP_SUPABASE_ANON_KEY` está completo
- [ ] Corrigi os valores se estavam errados
- [ ] Salvei as mudanças
- [ ] Fiz novo deploy "without cache"
- [ ] Testei login/cadastro
- [ ] Funcionou! ✅

---

## ✅ Valores Corretos (Para Referência)

**URL do Supabase:**
```
https://qgwirkyslfuftlefvnlu.supabase.co
```

**Chave Anônima (COMPLETA):**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFnd2lya3lzbGZ1ZnRsZWZ2bmx1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIwNTQ5MDgsImV4cCI6MjA3NzYzMDkwOH0.N49OPDERfdibRF14cSO74H5vxGHGK-5YRglMU43Thtw
```

---

**👉 Corrija as variáveis no Netlify agora e faça novo deploy!** 🚀
