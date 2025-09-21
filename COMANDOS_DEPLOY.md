# 🚀 Comandos para Deploy - VENO.AI

## 📋 **Comandos Rápidos:**

### **1. Primeiro Deploy (GitHub):**
```bash
# Inicializar Git
git init

# Adicionar arquivos
git add .

# Primeiro commit
git commit -m "Primeiro commit - VENO.AI"

# Conectar com GitHub
git remote add origin https://github.com/SEU_USUARIO/veno-ai.git

# Enviar para GitHub
git push -u origin main
```

### **2. Deploy Automático:**
```bash
# Windows
deploy.bat

# Linux/Mac
npm run deploy
```

### **3. Build Local:**
```bash
# Instalar dependências
npm install

# Fazer build
npm run build

# Testar build local
npx serve -s build
```

## 🌐 **Deploy no venoai.xyz:**

### **Opção 1 - Netlify (Recomendado):**
1. Acesse: https://netlify.com
2. Conecte com GitHub
3. Selecione: `veno-ai`
4. Configurações:
   - Build command: `npm run build`
   - Publish directory: `build`
5. Deploy!

### **Opção 2 - Vercel:**
1. Acesse: https://vercel.com
2. Conecte com GitHub
3. Selecione: `veno-ai`
4. Deploy automático!

### **Opção 3 - GitHub Pages:**
1. No repositório GitHub
2. Settings > Pages
3. Source: GitHub Actions
4. Deploy automático!

## 🔧 **Configuração do Domínio:**

### **No Netlify:**
1. Domain settings
2. Add custom domain: `venoai.xyz`
3. Configure DNS:
   - A: `75.2.60.5`
   - CNAME: `www` → `venoai.xyz`
4. SSL automático!

### **No Vercel:**
1. Project settings
2. Domains
3. Add: `venoai.xyz`
4. Configure DNS
5. SSL automático!

## 📧 **Configuração de Email:**

### **Para Produção:**
1. Abra: `src/services/emailConfig.js`
2. Configure: `admin@venoai.xyz`
3. Gere senha de app do Gmail
4. Substitua: `'sua_senha_app'`

## ✅ **Checklist de Deploy:**

- [ ] Repositório GitHub criado
- [ ] Código enviado para GitHub
- [ ] Deploy configurado (Netlify/Vercel)
- [ ] Domínio venoai.xyz configurado
- [ ] SSL ativado
- [ ] Email configurado
- [ ] Teste de funcionamento

## 🎯 **URLs Finais:**

- **GitHub:** https://github.com/SEU_USUARIO/veno-ai
- **Site:** https://venoai.xyz
- **Email:** admin@venoai.xyz

**Pronto para usar!** 🎉
