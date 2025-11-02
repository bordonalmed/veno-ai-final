# 🔧 Corrigir Build Falhado no Netlify

## ❌ Erro Detectado

Vejo que há um deploy que falhou:
- **Status**: Failed
- **Erro**: "Build script returned non-zero exit code: 2"
- **Commit**: master@e0b533b

## 🚀 SOLUÇÃO RÁPIDA

### 1. Configurar Variáveis de Ambiente (PRIMEIRO!)

1. **Na tela atual, clique em "Project configuration"** (botão azul na área principal)
2. **Ou** no menu lateral, clique em **"Project configuration"**
3. Vá em **"Environment variables"** (ou "Build & deploy" → "Environment variables")
4. **Adicione as 2 variáveis**:

**Variável 1:**
```
Key: REACT_APP_SUPABASE_URL
Value: https://qgwirkyslfuftlefvnlu.supabase.co
```

**Variável 2:**
```
Key: REACT_APP_SUPABASE_ANON_KEY
Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFnd2lya3lzbGZ1ZnRsZWZ2bmx1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIwNTQ5MDgsImV4cCI6MjA3NzYzMDkwOH0.N49OPDERfdibRF14cSO74H5vxGHGK-5YRglMU43Thtw
```

5. **Salve** as variáveis

### 2. Ver Logs do Build (Opcional - Para entender o erro)

1. **Clique em "Deploys"** no menu lateral
2. **Clique no deploy que falhou** (o vermelho "Failed")
3. **Veja os logs** para entender o erro específico
4. Anote o erro que aparece (normalmente falta de variáveis de ambiente)

### 3. Fazer Novo Deploy

1. **No menu lateral, clique em "Deploys"**
2. **Clique no botão "Trigger deploy"** (canto superior direito)
3. Escolha **"Clear cache and deploy site"** (recomendado!)
4. **Aguarde 2-5 minutos**
5. O build deve funcionar agora! ✅

---

## 🎯 PASSOS RESUMIDOS:

1. **"Project configuration"** → **"Environment variables"** → Adicionar variáveis
2. **"Deploys"** → **"Trigger deploy"** → **"Clear cache and deploy site"**
3. **Aguardar** 2-5 minutos
4. **Pronto!** ✅

---

## 🆘 Se Ainda Falhar

Se ainda der erro:

1. **Veja os logs** do build em "Deploys" → Clique no deploy
2. **Verifique**:
   - ✅ Variáveis de ambiente estão salvas?
   - ✅ Nomes das variáveis estão corretos?
   - ✅ Valores estão completos?
3. **Me envie** o erro dos logs para eu ajudar

---

## ✅ Depois de Funcionar

Depois que o build funcionar:
- O site estará acessível em: `venoai.xyz`
- Teste criar uma conta
- Teste fazer login
- Teste criar um exame

---

## 📚 Mais Informações

- **Guia Completo**: `CONECTAR_NETLIFY_AGORA.md`
- **Guia Geral**: `DEPLOY_INTERNET.md`

---

**👉 Depois de configurar as variáveis e fazer o deploy, me diga se funcionou!** 🚀
