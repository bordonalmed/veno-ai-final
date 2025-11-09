# 🔗 Configurar Webhook no Hotmart - PASSO A PASSO DETALHADO

## 🎯 OBJETIVO

Configurar o webhook no Hotmart para que o Premium seja ativado **automaticamente** quando alguém pagar, sem você precisar fazer nada manualmente.

---

## 📋 PASSO A PASSO COMPLETO

### **PASSO 1: Acessar o Painel do Hotmart**

1. **Acesse**: https://app.hotmart.com
2. **Faça login** com sua conta
3. Aguarde carregar o painel

---

### **PASSO 2: Encontrar o Produto Premium**

1. No menu lateral, procure por:
   - **"Meus Produtos"** ou **"Produtos"**
   - Ou clique em **"Área do Produtor"** → **"Meus Produtos"**

2. **Clique** no produto Premium que você está vendendo

3. Você verá a página de detalhes do produto

---

### **PASSO 3: Acessar Configurações de Integração**

1. Na página do produto, procure por:
   - **"Integrações"** (geralmente no menu superior ou lateral)
   - **"Webhooks"** (pode estar direto no menu)
   - **"Notificações"**
   - **"Configurações"** → **"Integrações"**

2. **Clique** na opção encontrada

💡 **Dica:** Se não encontrar, procure por:
   - Menu superior com abas: "Visão Geral", "Vendas", "Integrações"
   - Menu lateral com opções do produto

---

### **PASSO 4: Adicionar Novo Webhook**

1. Na seção de Webhooks, você verá:
   - Lista de webhooks existentes (se houver)
   - Botão **"Adicionar Webhook"** ou **"Novo Webhook"** ou **"Criar Webhook"**

2. **Clique** no botão para adicionar um novo webhook

---

### **PASSO 5: Preencher Dados do Webhook**

Você verá um formulário com os seguintes campos:

#### **5.1. URL do Webhook** (OBRIGATÓRIO)

**Cole esta URL:**
```
https://venoai.xyz/.netlify/functions/hotmartWebhook
```

⚠️ **IMPORTANTE:** 
- Cole exatamente como está acima
- Não adicione espaços no início ou fim
- Verifique se está completo

#### **5.2. Eventos para Receber** (OBRIGATÓRIO)

Selecione pelo menos:

✅ **`PURCHASE_APPROVED`** (Pagamento Aprovado) - **OBRIGATÓRIO**
- Este é o evento mais importante!
- Ativa Premium quando pagamento é aprovado

✅ **`PURCHASE_COMPLETE`** (Compra Completa) - **Recomendado**
- Ativa Premium quando compra é finalizada

⚠️ **Opcional** (se quiser):
- `PURCHASE_CANCELLED` (Compra Cancelada)
- `PURCHASE_REFUNDED` (Estorno)

**Como selecionar:**
- Geralmente há checkboxes ☑️
- Ou uma lista dropdown com múltipla seleção
- Marque os eventos desejados

#### **5.3. Status do Webhook** (OPCIONAL)

- Marque como **"Ativo"** ou **"Habilitado"**
- Deixe **"Teste"** desmarcado (se houver)

---

### **PASSO 6: Salvar o Webhook**

1. **Revise** os dados preenchidos:
   - ✅ URL está correta?
   - ✅ Eventos selecionados corretamente?
   - ✅ Webhook está ativo?

2. **Clique** em:
   - **"Salvar"**
   - **"Criar Webhook"**
   - **"Adicionar"**
   - **"Confirmar"**

3. Você verá uma mensagem de confirmação:
   - ✅ "Webhook criado com sucesso!"
   - ✅ "Webhook adicionado!"

---

### **PASSO 7: Verificar Webhook Criado**

1. Você deve ver o webhook na lista:
   - URL: `https://venoai.xyz/.netlify/functions/hotmartWebhook`
   - Status: **Ativo** ✅
   - Eventos: `PURCHASE_APPROVED`, etc.

2. **Anote** ou confirme:
   - Webhook está **ATIVO**
   - URL está correta
   - Eventos estão selecionados

---

## 🧪 TESTAR O WEBHOOK (OPCIONAL)

### **Opção 1: Teste via Hotmart (se disponível)**

1. Na lista de webhooks, procure por:
   - **"Testar"**
   - **"Enviar Webhook de Teste"**
   - **"Simular Evento"**

2. Se houver essa opção:
   - Clique nela
   - Selecione evento `PURCHASE_APPROVED`
   - Clique em "Enviar"
   - Verifique se o Premium foi ativado no Supabase

### **Opção 2: Teste Real**

1. Faça uma compra de teste no Hotmart
2. Verifique se o Premium foi ativado automaticamente
3. Verifique logs do Netlify Functions

---

## 🆘 PROBLEMAS COMUNS

### **Problema 1: Não encontro "Integrações"**

**Solução:**
- Procure por "Webhooks" diretamente
- Ou vá em "Configurações" → "Avançado" → "Webhooks"
- Ou procure na documentação do Hotmart sobre webhooks

### **Problema 2: Campo "URL" não aceita a URL**

**Solução:**
- Verifique se está copiando a URL completa
- Não adicione espaços
- Tente colar novamente
- Verifique se o Netlify já fez deploy

### **Problema 3: Não encontro "PURCHASE_APPROVED"**

**Solução:**
- Procure por "Pagamento Aprovado" (em português)
- Ou "Purchase Approved"
- Ou procure por lista de eventos disponíveis

### **Problema 4: Webhook criado mas não funciona**

**Verificar:**
1. ✅ Netlify já fez deploy? (aguarde 2-5 minutos)
2. ✅ `SUPABASE_SERVICE_ROLE_KEY` configurado no Netlify?
3. ✅ URL está correta?
4. ✅ Eventos estão selecionados?

---

## ✅ CHECKLIST

Antes de finalizar, verifique:

- [ ] ✅ URL do webhook está correta: `https://venoai.xyz/.netlify/functions/hotmartWebhook`
- [ ] ✅ Evento `PURCHASE_APPROVED` está selecionado
- [ ] ✅ Webhook está marcado como "Ativo"
- [ ] ✅ Webhook aparece na lista de webhooks
- [ ] ✅ Netlify já fez deploy do código
- [ ] ✅ `SUPABASE_SERVICE_ROLE_KEY` configurado no Netlify

---

## 📸 ONDE FICA NO HOTMART? (Geralmente)

```
Hotmart Dashboard
  └─ Meus Produtos
      └─ [Seu Produto Premium]
          └─ Integrações / Webhooks
              └─ Adicionar Webhook
                  └─ Preencher:
                      - URL
                      - Eventos
                      - Status: Ativo
                  └─ Salvar
```

---

## 🎯 RESULTADO ESPERADO

Após configurar:

✅ **Quando alguém pagar no Hotmart:**
   - Hotmart envia webhook para seu sistema
   - Sistema recebe automaticamente
   - Premium é ativado automaticamente no Supabase
   - Cliente faz login → Premium ativo! 🎉

✅ **Você não precisa fazer NADA!**
   - Tudo acontece automaticamente
   - Sistema 100% automatizado

---

## 📞 SE PRECISAR DE AJUDA

Se não conseguir encontrar as opções:

1. **Procure na documentação do Hotmart:**
   - Pesquise: "Hotmart webhook configuração"
   - Ou acesse a central de ajuda do Hotmart

2. **Entre em contato com suporte do Hotmart:**
   - Eles podem ajudar a localizar a opção de webhooks
   - Explique que quer configurar webhook para ativar acesso premium

3. **Use solução manual temporariamente:**
   - Enquanto não configura webhook, use a função manual
   - URL: `https://venoai.xyz/.netlify/functions/atualizar-premium-supabase?email=EMAIL&acao=ativar`

---

**👉 Siga os passos acima e configure o webhook no Hotmart!** 🚀

**Depois que configurar, teste fazendo uma compra e verifique se o Premium é ativado automaticamente!** ✅
