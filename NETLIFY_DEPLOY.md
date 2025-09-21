# 🌐 Deploy no Netlify - VENO.AI

## 🚀 **Passo a Passo Completo:**

### **1. Preparar o Projeto para GitHub:**

#### **A. Criar Repositório no GitHub:**
1. Acesse: https://github.com
2. Clique em "New repository"
3. Nome: `veno-ai`
4. Marque "Public"
5. Clique "Create repository"

#### **B. Enviar Código para GitHub:**
```bash
# No terminal, dentro da pasta do projeto:
git init
git add .
git commit -m "Primeiro commit - VENO.AI"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/veno-ai.git
git push -u origin main
```

### **2. Conectar com Netlify:**

#### **A. Acessar Netlify:**
1. Acesse: https://netlify.com
2. Clique em "Sign up" ou "Log in"
3. Escolha "Sign up with GitHub"

#### **B. Conectar Repositório:**
1. Clique em "New site from Git"
2. Escolha "GitHub"
3. Autorize o Netlify
4. Selecione o repositório `veno-ai`

#### **C. Configurar Build:**
- **Build command:** `npm run build`
- **Publish directory:** `build`
- **Node version:** `18` (ou deixar automático)

### **3. Configurar Domínio venoai.xyz:**

#### **A. No Netlify:**
1. Vá em "Site settings"
2. Clique em "Domain management"
3. Clique em "Add custom domain"
4. Digite: `venoai.xyz`
5. Clique em "Verify"

#### **B. Configurar DNS:**
1. No seu provedor de domínio (GoDaddy, Namecheap, etc.)
2. Configure os registros DNS:
   ```
   Tipo: A
   Nome: @
   Valor: 75.2.60.5
   
   Tipo: CNAME
   Nome: www
   Valor: venoai.xyz
   ```

#### **C. SSL Automático:**
- O Netlify ativa SSL automaticamente
- Aguarde alguns minutos
- Teste: https://venoai.xyz

### **4. Configurações Avançadas:**

#### **A. Variáveis de Ambiente:**
1. No Netlify: Site settings > Environment variables
2. Adicione:
   - `REACT_APP_EMAIL_FROM`: `admin@venoai.xyz`
   - `NODE_ENV`: `production`

#### **B. Redirects:**
1. Crie arquivo `public/_redirects`:
   ```
   /*    /index.html   200
   ```

#### **C. Headers de Segurança:**
1. Crie arquivo `public/_headers`:
   ```
   /*
     X-Frame-Options: DENY
     X-XSS-Protection: 1; mode=block
     X-Content-Type-Options: nosniff
   ```

### **5. Deploy Automático:**

#### **A. GitHub Actions (Opcional):**
- O arquivo `.github/workflows/deploy.yml` já está configurado
- Deploy automático a cada push

#### **B. Netlify Build:**
- Deploy automático a cada push no GitHub
- Build otimizado para produção
- CDN global

## 🔧 **Configurações Específicas:**

### **Build Settings:**
```yaml
Build command: npm run build
Publish directory: build
Node version: 18
```

### **Environment Variables:**
```env
REACT_APP_EMAIL_FROM=admin@venoai.xyz
NODE_ENV=production
```

### **Redirects:**
```
/*    /index.html   200
```

## ✅ **Checklist de Deploy:**

- [ ] Repositório GitHub criado
- [ ] Código enviado para GitHub
- [ ] Netlify conectado ao GitHub
- [ ] Build configurado (npm run build)
- [ ] Domínio venoai.xyz configurado
- [ ] DNS configurado no provedor
- [ ] SSL ativado
- [ ] Teste de funcionamento

## 🎯 **URLs Finais:**

- **GitHub:** https://github.com/SEU_USUARIO/veno-ai
- **Netlify:** https://venoai.xyz
- **Email:** admin@venoai.xyz

## 🚀 **Comandos Rápidos:**

### **Deploy Manual:**
```bash
# Build local
npm run build

# Enviar para GitHub
git add .
git commit -m "Deploy para Netlify"
git push origin main
```

### **Deploy Automático:**
```bash
# Usar o script
deploy.bat
```

## 📧 **Configuração de Email:**

### **Para Produção:**
1. Abra: `src/services/emailConfig.js`
2. Configure: `admin@venoai.xyz`
3. Gere senha de app do Gmail
4. Substitua: `'sua_senha_app'`

## 🎉 **Resultado Final:**

- **Site:** https://venoai.xyz
- **Deploy:** Automático
- **SSL:** Ativado
- **CDN:** Global
- **Email:** admin@venoai.xyz

**Pronto para usar!** 🚀
