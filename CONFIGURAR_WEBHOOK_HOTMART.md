# 🔄 Configurar Webhook Automático do Hotmart

## 🎯 OBJETIVO

Automatizar a ativação de Premium: quando um cliente paga no Hotmart, o Premium é ativado **automaticamente** sem você precisar fazer nada!

---

## ✅ O QUE FOI CRIADO

1. **Webhook funcional** (`hotmartWebhook.js`) ✅
   - Recebe notificações do Hotmart automaticamente
   - Ativa Premium no Supabase automaticamente
   - Funciona 100% automático!

2. **Função para ativar em lote** (`ativar-premium-lote.js`) ✅
   - Ativa Premium para usuários que já pagaram
   - Processa múltiplos emails de uma vez

3. **Script SQL** (`ATIVAR_PREMIUM_LOTE_SQL.sql`) ✅
   - Para ativar Premium em lote via SQL

---

## 🚀 PASSO 1: Configurar Variáveis no Netlify

### 1.1. Pegar Service Role Key no Supabase

1. Acesse: https://app.supabase.com
2. Selecione seu projeto
3. Vá em: **Settings → API**
4. Procure por: **"service_role" key**
5. **Copie a chave** (não a anon key!)
6. ⚠️ **Mantenha segura!** Esta chave tem acesso total.

### 1.2. Adicionar no Netlify

1. Acesse: https://app.netlify.com
2. Selecione seu site
3. Vá em: **Site settings → Environment variables**
4. Adicione as variáveis:

```
SUPABASE_URL = https://qgwirkyslfuftlefvnlu.supabase.co
SUPABASE_SERVICE_ROLE_KEY = sua-service-role-key-aqui
```

5. Clique em **"Save"**

---

## 🔗 PASSO 2: Configurar Webhook no Hotmart

### 2.1. Acessar Configurações do Produto

1. Acesse seu painel do Hotmart
2. Vá em: **"Meus Produtos"**
3. Clique no produto Premium
4. Vá em: **"Configurações"** ou **"Integrações"**

### 2.2. Configurar Webhook

1. Procure por: **"Webhooks"** ou **"Notificações"**
2. Clique em: **"Adicionar Webhook"** ou **"Configurar Webhook"**
3. Preencha:

**URL do Webhook:**
```
https://venoai.xyz/.netlify/functions/hotmartWebhook
```

**Eventos para receber:**
- ✅ `PURCHASE_APPROVED` (Pagamento Aprovado) - **OBRIGATÓRIO**
- ✅ `PURCHASE_COMPLETE` (Compra Completa) - **Recomendado**
- ⚠️ `PURCHASE_CANCELLED` (Compra Cancelada) - Opcional
- ⚠️ `PURCHASE_REFUNDED` (Estorno) - Opcional

4. **Salve** as configurações

### 2.3. Testar Webhook (Opcional)

O Hotmart pode ter uma opção de "Testar Webhook" ou "Enviar Webhook de Teste". Use para verificar se está funcionando.

---

## 📋 PASSO 3: Ativar Premium para Usuários que Já Pagaram

Você tem **3 opções** para ativar Premium para usuários que já pagaram:

### **OPÇÃO A: Via Função Netlify (RECOMENDADO)** 🚀

**Envie lista de emails via POST:**

```bash
curl -X POST https://venoai.xyz/.netlify/functions/ativar-premium-lote \
  -H "Content-Type: application/json" \
  -d '{
    "emails": [
      "cliente1@email.com",
      "cliente2@email.com",
      "cliente3@email.com"
    ]
  }'
```

**Ou via JavaScript:**
```javascript
fetch('https://venoai.xyz/.netlify/functions/ativar-premium-lote', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    emails: [
      'cliente1@email.com',
      'cliente2@email.com',
      'cliente3@email.com'
    ]
  })
})
.then(res => res.json())
.then(data => console.log(data));
```

**Ou use o arquivo HTML de teste:**
- Crie um arquivo HTML com formulário
- Adicione os emails
- Envie via POST

### **OPÇÃO B: Via SQL no Supabase** 📊

1. Abra o arquivo: `ATIVAR_PREMIUM_LOTE_SQL.sql`
2. Substitua os emails de exemplo pelos emails reais
3. Acesse: https://app.supabase.com → SQL Editor
4. Cole o SQL e execute
5. Verifique os resultados

### **OPÇÃO C: Via URL Individual** 🔗

Para cada usuário:
```
https://venoai.xyz/.netlify/functions/atualizar-premium-supabase?email=cliente@email.com&acao=ativar
```

---

## 🔍 PASSO 4: Verificar se Funcionou

### 4.1. Verificar no Supabase

```sql
SELECT email, premium, plano, updated_at
FROM users
WHERE premium = true
ORDER BY updated_at DESC;
```

### 4.2. Testar Webhook

1. Faça uma compra de teste no Hotmart (ou use sandbox)
2. Verifique os logs do Netlify Functions
3. Verifique se o Premium foi ativado no Supabase

### 4.3. Testar Login

1. Cliente faz login no site
2. Sistema verifica Premium automaticamente
3. Premium deve estar ativo! ✅

---

## 🆘 TROUBLESHOOTING

### Webhook não recebe notificações

**Causas possíveis:**
- URL do webhook incorreta no Hotmart
- Netlify não fez deploy ainda (aguarde 2-5 minutos)
- Eventos não configurados no Hotmart

**Solução:**
1. Verifique URL no Hotmart está correta
2. Verifique logs do Netlify Functions
3. Teste enviando webhook manualmente

### Premium não ativa automaticamente

**Causas possíveis:**
- Usuário não existe no Supabase (precisa se cadastrar primeiro)
- Email não corresponde ao email do login
- Webhook não está processando corretamente

**Solução:**
1. Verifique logs do webhook no Netlify
2. Verifique se usuário existe na tabela `users`
3. Ative manualmente como fallback

### Usuário não encontrado no webhook

**Causa:** Cliente pagou antes de se cadastrar no site.

**Solução:**
1. Cliente deve se cadastrar no site primeiro
2. Ou você pode criar o perfil manualmente no Supabase
3. Depois ative Premium manualmente ou aguarde próximo webhook

---

## ✅ CHECKLIST

- [ ] Service Role Key configurada no Netlify
- [ ] Webhook configurado no Hotmart
- [ ] URL do webhook: `https://venoai.xyz/.netlify/functions/hotmartWebhook`
- [ ] Evento `PURCHASE_APPROVED` configurado
- [ ] Deploy do Netlify concluído
- [ ] Testei webhook (compra de teste)
- [ ] Ativei Premium para usuários que já pagaram
- [ ] Verifiquei funcionando ✅

---

## 🎯 RESULTADO FINAL

✅ **Webhook configurado e funcionando!**  
✅ **Premium ativado automaticamente quando cliente paga!**  
✅ **Usuários que já pagaram têm Premium ativado!**  
✅ **Sistema 100% automatizado!** 🚀

---

**👉 Configure o webhook no Hotmart e teste!** 🎉
