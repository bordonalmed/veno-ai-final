# 💎 Restabelecer Usuários Premium do Hotmart

## 🎯 PROBLEMA

Usuários que assinaram o plano Premium no Hotmart precisam ter o acesso restabelecido no sistema para continuarem acessando como Premium.

---

## ✅ SOLUÇÕES DISPONÍVEIS

Temos **3 formas** de restabelecer o acesso Premium:

### 1. **Via Função Netlify (RECOMENDADO)** 🚀
Atualiza diretamente no Supabase via função serverless.

### 2. **Via SQL no Supabase** 📊
Atualiza múltiplos usuários de uma vez via SQL.

### 3. **Via Lista Manual** 📝
Mantém lista de fallback para casos especiais.

---

## 🚀 SOLUÇÃO 1: Via Função Netlify (RECOMENDADO)

### Como Usar:

**Ativar Premium para um usuário:**
```
https://venoai.xyz/.netlify/functions/atualizar-premium-supabase?email=cliente@email.com&acao=ativar
```

**Verificar se é Premium:**
```
https://venoai.xyz/.netlify/functions/atualizar-premium-supabase?email=cliente@email.com&acao=verificar
```

**Listar todos Premium:**
```
https://venoai.xyz/.netlify/functions/atualizar-premium-supabase?acao=listar
```

### ⚠️ IMPORTANTE:

Para a função funcionar, você precisa configurar no Netlify:

1. **Acesse**: Netlify Dashboard → Seu Site → Environment variables
2. **Adicione**:
   - `SUPABASE_URL` = `https://qgwirkyslfuftlefvnlu.supabase.co`
   - `SUPABASE_SERVICE_ROLE_KEY` = (pegue no Supabase: Settings → API → service_role key)

### Passo a Passo:

1. **Pegar Service Role Key no Supabase:**
   - Acesse: https://app.supabase.com
   - Selecione seu projeto
   - Vá em: Settings → API
   - Copie a **"service_role" key** (não a anon key!)
   - ⚠️ Esta chave tem acesso total, mantenha segura!

2. **Adicionar no Netlify:**
   - Acesse: https://app.netlify.com
   - Selecione seu site
   - Vá em: Site settings → Environment variables
   - Adicione:
     - `SUPABASE_URL` = sua URL do Supabase
     - `SUPABASE_SERVICE_ROLE_KEY` = sua service role key
   - Clique em "Save"

3. **Fazer Deploy:**
   - O Netlify fará deploy automático
   - Aguarde 2-5 minutos

4. **Testar:**
   - Use a URL acima para ativar Premium
   - Substitua `cliente@email.com` pelo email real

---

## 📊 SOLUÇÃO 2: Via SQL no Supabase

### Passo a Passo:

1. **Acesse o Supabase:**
   - https://app.supabase.com
   - Selecione seu projeto

2. **Abra o SQL Editor:**
   - Menu lateral → SQL Editor
   - Clique em "New query"

3. **Copie e Execute o SQL:**

**Para um usuário:**
```sql
UPDATE users
SET 
  premium = true,
  plano = 'premium',
  trial_ativo = false,
  updated_at = NOW()
WHERE LOWER(email) = LOWER('email-do-cliente@exemplo.com');
```

**Para múltiplos usuários:**
```sql
UPDATE users
SET 
  premium = true,
  plano = 'premium',
  trial_ativo = false,
  updated_at = NOW()
WHERE LOWER(email) IN (
  LOWER('cliente1@email.com'),
  LOWER('cliente2@email.com'),
  LOWER('cliente3@email.com')
);
```

4. **Verificar:**
```sql
SELECT email, nome, premium, plano, updated_at
FROM users
WHERE premium = true
ORDER BY updated_at DESC;
```

### 📄 Arquivo SQL Completo:

Use o arquivo `ATUALIZAR_PREMIUM_HOTMART_SQL.sql` que foi criado!
- Abra no editor de texto
- Substitua os emails de exemplo pelos emails reais
- Cole no Supabase SQL Editor
- Execute!

---

## 📝 SOLUÇÃO 3: Via Lista Manual (Fallback)

Se as outras soluções não funcionarem, você pode adicionar emails manualmente:

### Arquivo: `netlify/functions/verificar-usuario-v2.js`

Edite a lista:
```javascript
const emailsPremiumConfirmados = [
  'vasculargabriel@gmail.com',
  'cliente1@email.com',  // Adicione aqui
  'cliente2@email.com',  // Adicione aqui
  // ... mais emails
];
```

⚠️ **Não recomendado**: Lista manual não sincroniza com Supabase.

---

## ✅ VERIFICAR SE FUNCIONOU

### 1. Verificar no Supabase:

```sql
SELECT email, premium, plano, updated_at
FROM users
WHERE premium = true;
```

### 2. Testar Login:

1. Usuário faz login
2. Sistema verifica Premium automaticamente
3. Deve aparecer como Premium ✅

### 3. Verificar Console (F12):

Ao fazer login, deve aparecer:
```
✅ [PREMIUM] Status do Supabase: { email: '...', premium: true }
```

---

## 🆘 PROBLEMAS COMUNS

### Erro: "Usuário não encontrado"

**Causa**: Usuário não se cadastrou ainda no sistema.

**Solução**: 
1. O usuário precisa se cadastrar primeiro
2. Depois você ativa o Premium

### Erro: "Supabase não configurado"

**Causa**: Variáveis de ambiente não configuradas no Netlify.

**Solução**: 
1. Configure `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` no Netlify
2. Faça redeploy

### Premium não aparece após atualizar

**Causa**: Sistema ainda usando cache/localStorage.

**Solução**:
1. Usuário deve fazer logout
2. Fazer login novamente
3. Sistema buscará status do Supabase

---

## 📋 CHECKLIST

- [ ] Service Role Key configurado no Netlify
- [ ] Função `atualizar-premium-supabase.js` criada
- [ ] Testei ativar Premium para um usuário
- [ ] Verifiquei no Supabase que está como Premium
- [ ] Testei login do usuário
- [ ] Funcionou! ✅

---

## 🎯 RECOMENDAÇÃO FINAL

**Use a SOLUÇÃO 1 (Função Netlify)** para atualizações individuais.

**Use a SOLUÇÃO 2 (SQL)** para atualizar múltiplos usuários de uma vez.

---

## 📚 ARQUIVOS CRIADOS

- ✅ `netlify/functions/atualizar-premium-supabase.js` - Função Netlify
- ✅ `ATUALIZAR_PREMIUM_HOTMART_SQL.sql` - Script SQL
- ✅ `src/services/premiumService.js` - Atualizado para Supabase
- ✅ `netlify/functions/verificar-usuario-v2.js` - Atualizado para Supabase

---

**👉 Configure o Netlify e teste!** 🚀
