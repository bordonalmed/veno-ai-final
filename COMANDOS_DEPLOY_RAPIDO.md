# ⚡ Comandos Rápidos para Deploy

## 🚀 Deploy Rápido no Netlify

### Passo 1: Preparar Git (se ainda não fez)

```bash
# Inicializar Git
git init

# Configurar Git (primeira vez)
git config user.name "Seu Nome"
git config user.email "seu@email.com"

# Adicionar todos os arquivos
git add .

# Fazer commit
git commit -m "Deploy inicial - VENO.AI com Supabase"

# Conectar com GitHub (substitua SEU_USUARIO)
git remote add origin https://github.com/SEU_USUARIO/veno-ai.git

# Enviar para GitHub
git branch -M main
git push -u origin main
```

### Passo 2: No Netlify

1. Acesse: **https://netlify.com**
2. Clique em **"Add new site"** → **"Import an existing project"**
3. Escolha **"Deploy with GitHub"**
4. Selecione o repositório **`veno-ai`**
5. Configure variáveis de ambiente:

**Variável 1:**
- Key: `REACT_APP_SUPABASE_URL`
- Value: `https://qgwirkyslfuftlefvnlu.supabase.co`

**Variável 2:**
- Key: `REACT_APP_SUPABASE_ANON_KEY`
- Value: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFnd2lya3lzbGZ1ZnRsZWZ2bmx1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIwNTQ5MDgsImV4cCI6MjA3NzYzMDkwOH0.N49OPDERfdibRF14cSO74H5vxGHGK-5YRglMU43Thtw`

6. Clique em **"Deploy site"**
7. Aguarde 2-5 minutos
8. Pronto! ✅

### Passo 3: Atualizar no Futuro

Quando fizer mudanças:

```bash
git add .
git commit -m "Descrição da mudança"
git push
```

O Netlify faz deploy automaticamente! 🚀

---

## ✅ Checklist

- [ ] Conta criada no GitHub
- [ ] Repositório criado no GitHub
- [ ] Código enviado para GitHub
- [ ] Conta criada no Netlify
- [ ] Repositório conectado no Netlify
- [ ] Variáveis de ambiente configuradas no Netlify
- [ ] Deploy realizado com sucesso!

---

## 🆘 Problemas?

- **Erro ao enviar para GitHub**: Verifique se o Git está instalado
- **Build falha no Netlify**: Verifique se as variáveis de ambiente estão configuradas
- **Supabase não funciona**: Verifique se as variáveis estão no Netlify

---

## 📚 Documentação Completa

- **Guia Completo**: `DEPLOY_INTERNET.md`
- **Passo a Passo Detalhado**: `DEPLOY_NETLIFY_PASSO_A_PASSO.md`

---

**👉 Pronto para fazer deploy? Me diga quando criar o repositório no GitHub!** 🚀
