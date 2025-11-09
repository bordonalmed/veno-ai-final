# 🔄 Migrar Usuários Premium do Hotmart para Supabase

## 🎯 PROBLEMA

Você tem usuários que **pagaram pelo plano premium no Hotmart** e precisa garantir que eles **continuem acessando a plataforma** após a migração do Firebase para Supabase.

---

## ✅ SOLUÇÃO COMPLETA

### **OPÇÃO 1: Verificação Automática no Login (JÁ IMPLEMENTADO)** ✅

**O sistema já verifica automaticamente quando o usuário faz login!**

**Como funciona:**
1. Usuário faz login ✅
2. Sistema verifica se pagou no Hotmart ✅
3. Se pagou → Premium ativado automaticamente! ✅

**Lista de emails que pagaram no Hotmart:**
- Está em `netlify/functions/verificar-usuario-v2.js`
- Adicione novos emails lá quando necessário

---

### **OPÇÃO 2: Ativar Premium Manualmente (IMEDIATO)** 🚀

**Para usuários que já pagaram e precisam acessar AGORA:**

#### **Via URL (MAIS RÁPIDO):**

```
https://venoai.xyz/.netlify/functions/atualizar-premium-supabase?email=CLIENTE@EMAIL.COM&acao=ativar
```

**Exemplo:**
```
https://venoai.xyz/.netlify/functions/atualizar-premium-supabase?email=joao@email.com&acao=ativar
```

**Para múltiplos usuários:**
1. Ative um por um usando as URLs
2. Ou use a função de ativação em lote (ver OPÇÃO 3)

---

### **OPÇÃO 3: Ativar Premium em Lote** 📦

**Para ativar vários usuários de uma vez:**

#### **Via URL:**
```
https://venoai.xyz/.netlify/functions/ativar-premium-lote?emails=email1@exemplo.com,email2@exemplo.com&acao=ativar-lote
```

**Exemplo:**
```
https://venoai.xyz/.netlify/functions/ativar-premium-lote?emails=vasculargabriel@gmail.com,bordonalmed@yahoo.com.br&acao=ativar-lote
```

---

### **OPÇÃO 4: Via SQL no Supabase** 📊

**Para ativar premium diretamente no banco de dados:**

1. **Acesse:** https://app.supabase.com
2. **Vá em:** SQL Editor
3. **Execute este SQL:**

#### **Para UM usuário:**
```sql
UPDATE users
SET 
  premium = true,
  plano = 'premium',
  trial_ativo = false,
  updated_at = NOW()
WHERE LOWER(email) = LOWER('cliente@email.com');
```

#### **Para MÚLTIPLOS usuários:**
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

---

## 📝 ADICIONAR NOVOS EMAILS PREMIUM

### **Quando um cliente paga no Hotmart:**

#### **Método 1: Adicionar na lista automática (RECOMENDADO)**

1. **Edite o arquivo:** `netlify/functions/verificar-usuario-v2.js`
2. **Adicione o email na lista:**

```javascript
const emailsPagaramNoHotmart = [
  'vasculargabriel@gmail.com',
  'bordonalmed@yahoo.com.br',
  'NOVO_CLIENTE@EMAIL.COM', // ← Adicione aqui
  // Adicione mais emails aqui
];
```

3. **Faça commit e push para o GitHub**
4. **Netlify fará deploy automaticamente**
5. **Pronto!** Quando o cliente fizer login, Premium será ativado automaticamente! ✅

---

#### **Método 2: Ativar manualmente via URL**

Use a URL:
```
https://venoai.xyz/.netlify/functions/atualizar-premium-supabase?email=NOVO_CLIENTE@EMAIL.COM&acao=ativar
```

---

## 🔍 VERIFICAR STATUS PREMIUM

### **Verificar se um usuário é Premium:**

**Via URL:**
```
https://venoai.xyz/.netlify/functions/verificar-usuario-v2?email=cliente@email.com
```

**Resposta:**
```json
{
  "email": "cliente@email.com",
  "premium": true,
  "plano": "premium",
  "fonte": "supabase" // ou "hotmart-ativado-automaticamente"
}
```

---

### **Via SQL:**
```sql
SELECT 
  email,
  premium,
  plano,
  updated_at
FROM users
WHERE LOWER(email) = LOWER('cliente@email.com');
```

---

## 🚀 PROCESSO RECOMENDADO

### **Para usuários que JÁ PAGARAM:**

1. **Coletar lista de emails que pagaram no Hotmart**
2. **Ativar via SQL (mais rápido para muitos usuários):**
   ```sql
   UPDATE users
   SET premium = true, plano = 'premium', trial_ativo = false
   WHERE LOWER(email) IN (
     LOWER('email1@exemplo.com'),
     LOWER('email2@exemplo.com'),
     -- Adicione todos os emails aqui
   );
   ```
3. **OU ativar via URL (um por um ou em lote)**
4. **Adicionar emails na lista automática em `verificar-usuario-v2.js`**

### **Para NOVOS pagamentos no Hotmart:**

1. **Cliente paga no Hotmart** ✅
2. **Você recebe notificação** 📧
3. **Adicione email na lista em `verificar-usuario-v2.js`** ✅
4. **OU ative via URL imediatamente** 🚀
5. **Quando cliente fizer login → Premium ativado automaticamente!** ✅

---

## ✅ CHECKLIST

- [ ] ✅ Coletar lista de emails que pagaram no Hotmart
- [ ] ✅ Ativar Premium para todos via SQL ou URL
- [ ] ✅ Adicionar emails na lista automática em `verificar-usuario-v2.js`
- [ ] ✅ Fazer commit e push para GitHub
- [ ] ✅ Testar login com um email premium
- [ ] ✅ Verificar se Premium está sendo reconhecido
- [ ] ✅ Sistema funcionando! ✅

---

## 📚 ARQUIVOS RELACIONADOS

- ✅ `netlify/functions/verificar-usuario-v2.js` - Verifica e ativa Premium automaticamente
- ✅ `netlify/functions/atualizar-premium-supabase.js` - Ativa Premium manualmente
- ✅ `netlify/functions/ativar-premium-lote.js` - Ativa Premium em lote
- ✅ `ATIVAR_PREMIUM_LOTE_SQL.sql` - Script SQL para ativar em lote
- ✅ `MIGRAR_USUARIOS_PREMIUM_HOTMART.md` - Este guia

---

## 🆘 TROUBLESHOOTING

### **Usuário pagou mas não consegue acessar:**

1. **Verificar se está na lista de emails premium:**
   - Verifique em `verificar-usuario-v2.js`
   - Ou execute SQL para verificar status

2. **Ativar Premium manualmente:**
   - Use URL: `https://venoai.xyz/.netlify/functions/atualizar-premium-supabase?email=EMAIL&acao=ativar`
   - Ou via SQL

3. **Verificar se usuário existe no Supabase:**
   - Usuário precisa fazer login pelo menos uma vez
   - Se não existe, criar manualmente (ver guia de criação)

---

## 💡 DICA IMPORTANTE

**Adicione TODOS os emails premium na lista automática (`verificar-usuario-v2.js`)!**

Isso garante que:
- ✅ Premium é ativado automaticamente no login
- ✅ Funciona mesmo se ativação manual falhar
- ✅ Sistema sempre verifica Hotmart automaticamente

---

**👉 Use este guia para garantir que todos os usuários premium continuem acessando!** 🚀

