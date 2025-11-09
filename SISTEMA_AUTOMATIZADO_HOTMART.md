# 🤖 Sistema Automatizado Hotmart - VENO.AI

## 🎯 OBJETIVO

**Totalmente automatizado:** Quando usuário paga no Hotmart → Acesso Premium liberado automaticamente! ✅

---

## ✅ COMO FUNCIONA AGORA (100% AUTOMATIZADO)

### **Fluxo Completo Automatizado:**

1. **Cliente paga no Hotmart** ✅
2. **Hotmart envia webhook automaticamente** → `https://venoai.xyz/.netlify/functions/hotmartWebhook`
3. **Sistema recebe webhook e:**
   - ✅ Verifica pagamento
   - ✅ **Cria usuário automaticamente se não existir**
   - ✅ Ativa Premium automaticamente no Supabase
   - ✅ Usuário já pode acessar Premium! 🎉

4. **Cliente faz login** → Premium já está ativo! ✅

---

## 🔄 PARA USUÁRIOS QUE JÁ PAGARAM

### **Sistema Identifica Automaticamente no Login:**

1. **Cliente faz login** ✅
2. **Sistema verifica automaticamente:**
   - ✅ Verifica no Supabase (se já tem Premium)
   - ✅ Verifica lista de emails que pagaram no Hotmart
   - ✅ **Se pagou mas não tem Premium → Ativa automaticamente!**

3. **Premium ativado!** ✅

---

## 🔧 CONFIGURAÇÃO DO WEBHOOK

### **PASSO 1: Configurar Webhook no Hotmart**

1. **Acesse:** https://app.hotmart.com
2. **Vá em:** Ferramentas → Webhooks
3. **Clique em:** "Cadastrar Webhook"
4. **Configure:**
   - **URL de Notificação:** `https://venoai.xyz/.netlify/functions/hotmartWebhook`
   - **Eventos para monitorar:**
     - ✅ `PURCHASE_APPROVED` (Compra Aprovada)
     - ✅ `PURCHASE_COMPLETE` (Compra Completa)
     - ✅ `SUBSCRIPTION_ACTIVE` (Assinatura Ativa)

5. **Salve** e pronto! ✅

### **PASSO 2: Configurar Variáveis no Netlify**

Certifique-se de que estas variáveis estão configuradas no Netlify:

- `REACT_APP_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` (ou `REACT_APP_SUPABASE_SERVICE_ROLE_KEY`)

**Como verificar:**
1. Netlify → Site → Environment variables
2. Verifique se as variáveis estão configuradas
3. Se não estiverem, adicione-as

---

## 🎯 EVENTOS DO WEBHOOK

### **Eventos que Ativam Premium Automaticamente:**

- ✅ `PURCHASE_APPROVED` - Pagamento aprovado
- ✅ `PURCHASE_COMPLETE` - Compra completa (com status ACTIVE)

### **O que o Webhook Faz:**

1. **Recebe notificação do Hotmart**
2. **Extrai dados do pagamento:**
   - Email do comprador
   - ID da transação
   - Status da assinatura

3. **Busca ou cria usuário:**
   - Se usuário existe → Atualiza Premium
   - Se usuário NÃO existe → **Cria automaticamente** com Premium ativo! ✅

4. **Ativa Premium no Supabase:**
   - Atualiza tabela `users` com `premium = true`
   - Define `plano = 'premium'`

5. **Pronto!** Usuário pode fazer login e acessar Premium! ✅

---

## 📋 LISTA DE EMAILS (Backup)

### **Para Usuários que Já Pagaram (Antes do Webhook)**

A lista em `verificar-usuario-v2.js` serve como **backup** para usuários que pagaram antes do webhook estar configurado.

**Lista atual:**
```javascript
const emailsPagaramNoHotmart = [
  'vasculargabriel@gmail.com',
  'bordonalmed@yahoo.com.br',
  // Adicione aqui emails de usuários que pagaram antes do webhook
];
```

**Esta lista é verificada automaticamente no login** para garantir que usuários que pagaram antes do webhook também tenham acesso.

---

## 🔍 VERIFICAÇÃO AUTOMÁTICA NO LOGIN

### **O que acontece quando usuário faz login:**

1. **Login realizado** ✅
2. **Sistema verifica automaticamente:**
   ```javascript
   // Verifica no Supabase primeiro
   const userData = await supabase
     .from('users')
     .select('premium, plano')
     .eq('email', email)
     .single();
   
   // Se não encontrou Premium, verifica lista do Hotmart
   if (!userData.premium) {
     // Verifica lista de emails que pagaram
     if (emailsPagaramNoHotmart.includes(email)) {
       // Ativa Premium automaticamente!
       await supabase
         .from('users')
         .update({ premium: true, plano: 'premium' })
         .eq('email', email);
     }
   }
   ```

3. **Premium ativado automaticamente!** ✅

---

## ✅ CHECKLIST DE CONFIGURAÇÃO

### **1. Webhook Configurado no Hotmart:**
- [ ] ✅ Acessei https://app.hotmart.com
- [ ] ✅ Fui em Ferramentas → Webhooks
- [ ] ✅ Configurei URL: `https://venoai.xyz/.netlify/functions/hotmartWebhook`
- [ ] ✅ Selecionei eventos: `PURCHASE_APPROVED`, `PURCHASE_COMPLETE`
- [ ] ✅ Salvei e ativei o webhook

### **2. Variáveis Configuradas no Netlify:**
- [ ] ✅ `REACT_APP_SUPABASE_URL` configurada
- [ ] ✅ `SUPABASE_SERVICE_ROLE_KEY` configurada
- [ ] ✅ Variáveis estão no deploy em produção

### **3. Testar Funcionamento:**
- [ ] ✅ Fiz uma compra de teste no Hotmart
- [ ] ✅ Verifiquei se webhook foi recebido (logs Netlify)
- [ ] ✅ Verifiquei se usuário foi criado/atualizado no Supabase
- [ ] ✅ Testei login com email do pagamento
- [ ] ✅ Confirmei que Premium está ativo! ✅

---

## 🧪 TESTAR SISTEMA AUTOMATIZADO

### **Teste 1: Novo Pagamento (Webhook)**

1. **Faça uma compra de teste no Hotmart**
2. **Verifique logs do Netlify:**
   - Netlify → Site → Functions → `hotmartWebhook` → Logs
   - Deve mostrar: `✅ [WEBHOOK] Premium ativado com sucesso`

3. **Verifique no Supabase:**
   - SQL Editor → Execute:
   ```sql
   SELECT email, premium, plano FROM users 
   WHERE email = 'email-do-teste@exemplo.com';
   ```
   - Deve mostrar: `premium = true`, `plano = 'premium'`

4. **Teste login:**
   - Faça login com o email do teste
   - Premium deve estar ativo! ✅

### **Teste 2: Usuário que Já Pagou (Lista de Backup)**

1. **Use email da lista:** `vasculargabriel@gmail.com`
2. **Faça login**
3. **Sistema verifica automaticamente na lista**
4. **Premium ativado automaticamente!** ✅

---

## 📚 ARQUIVOS DO SISTEMA

### **Funções Netlify:**
- ✅ `netlify/functions/hotmartWebhook.js` - Recebe webhook do Hotmart e ativa Premium automaticamente
- ✅ `netlify/functions/verificar-usuario-v2.js` - Verifica Premium no login (inclui lista de backup)

### **Código Frontend:**
- ✅ `src/App.js` - Chama verificação automática no login
- ✅ `src/utils/trialManager.js` - Gerencia verificação de Premium

### **Documentação:**
- ✅ `SISTEMA_AUTOMATIZADO_HOTMART.md` - Este guia completo
- ✅ `CONFIGURAR_WEBHOOK_HOTMART_PASSO_A_PASSO.md` - Guia visual de configuração

---

## 🆘 TROUBLESHOOTING

### **Problema: Webhook não está recebendo notificações**

**Verificar:**
1. URL do webhook está correto no Hotmart?
2. Webhook está ativado no Hotmart?
3. Eventos corretos estão selecionados?

**Solução:**
- Verifique logs do Netlify em `hotmartWebhook`
- Teste enviando webhook manualmente (se possível)
- Verifique se a URL está acessível publicamente

### **Problema: Webhook recebe mas não cria usuário**

**Verificar:**
1. `SUPABASE_SERVICE_ROLE_KEY` está configurada no Netlify?
2. Usuário já existe no Supabase Auth?

**Solução:**
- Verifique logs do webhook para erros
- Verifique se service role key tem permissões corretas
- Teste criar usuário manualmente no Supabase

### **Problema: Usuário paga mas Premium não ativa**

**Verificar:**
1. Webhook foi recebido? (ver logs)
2. Email está correto no pagamento?
3. Usuário existe no Supabase?

**Solução:**
- Verifique logs do Netlify
- Adicione email na lista de backup (`verificar-usuario-v2.js`)
- Ative Premium manualmente via URL ou SQL

---

## 🎉 RESULTADO ESPERADO

### **Fluxo Totalmente Automatizado:**

1. ✅ **Cliente paga no Hotmart**
2. ✅ **Webhook recebe notificação automaticamente**
3. ✅ **Sistema cria usuário automaticamente (se não existir)**
4. ✅ **Premium ativado automaticamente**
5. ✅ **Cliente faz login → Premium já está ativo!** 🎉

### **Para Usuários que Já Pagaram:**

1. ✅ **Cliente faz login**
2. ✅ **Sistema verifica lista automaticamente**
3. ✅ **Premium ativado automaticamente se pagou**
4. ✅ **Acesso Premium liberado!** ✅

---

## 💡 DICA IMPORTANTE

**Mantenha a lista de emails atualizada em `verificar-usuario-v2.js` como backup!**

Isso garante que:
- ✅ Usuários que pagaram antes do webhook também tenham acesso
- ✅ Sistema funciona mesmo se webhook falhar temporariamente
- ✅ Verificação dupla garante que ninguém fique sem acesso

---

**👉 Sistema totalmente automatizado! Configure o webhook no Hotmart e pronto!** 🚀

