# 🚀 Deploy no GitHub e venoai.xyz

## 📋 **Passo a Passo Completo:**

### **1. Salvar no GitHub:**

#### **A. Criar Repositório:**
1. Acesse: https://github.com
2. Clique em "New repository"
3. Nome: `veno-ai` (ou outro)
4. Marque "Public" ou "Private"
5. Clique "Create repository"

#### **B. Conectar Projeto:**
```bash
# No terminal, dentro da pasta do projeto:
git init
git add .
git commit -m "Primeiro commit - VENO.AI"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/veno-ai.git
git push -u origin main
```

### **2. Deploy no venoai.xyz:**

#### **Opção A - Netlify (Mais Fácil):**
1. Acesse: https://netlify.com
2. Conecte com GitHub
3. Selecione o repositório `veno-ai`
4. Configurações:
   - Build command: `npm run build`
   - Publish directory: `build`
5. Deploy automático!

#### **Opção B - Vercel:**
1. Acesse: https://vercel.com
2. Conecte com GitHub
3. Selecione o repositório `veno-ai`
4. Deploy automático!

#### **Opção C - GitHub Pages:**
1. No repositório GitHub
2. Settings > Pages
3. Source: GitHub Actions
4. Deploy automático!

### **3. Configurar Domínio Personalizado:**

#### **No Netlify/Vercel:**
1. Domain settings
2. Add custom domain: `venoai.xyz`
3. Configure DNS no seu provedor
4. SSL automático!

## 🔧 **Configurações Específicas:**

### **Para venoai.xyz:**
- **Domínio:** venoai.xyz
- **Subdomínio:** www.venoai.xyz
- **SSL:** Automático
- **CDN:** Global

### **Variáveis de Ambiente:**
- `REACT_APP_SENDGRID_API_KEY` (se usar SendGrid)
- `REACT_APP_EMAIL_FROM` (admin@venoai.xyz)

## 📁 **Arquivos Necessários:**

### **1. .gitignore:**
```
node_modules/
build/
.env
.env.local
.env.development.local
.env.test.local
.env.production.local
```

### **2. package.json:**
```json
{
  "homepage": "https://venoai.xyz",
  "scripts": {
    "build": "react-scripts build",
    "deploy": "npm run build && gh-pages -d build"
  }
}
```

## 🚀 **Deploy Automático:**

### **GitHub Actions:**
```yaml
name: Deploy to venoai.xyz
on:
  push:
    branches: [ main ]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm install
      - run: npm run build
      - run: npm run deploy
```

## ✅ **Checklist Final:**

- [ ] Repositório GitHub criado
- [ ] Código enviado para GitHub
- [ ] Deploy configurado (Netlify/Vercel)
- [ ] Domínio venoai.xyz configurado
- [ ] SSL ativado
- [ ] Teste de funcionamento
- [ ] Email configurado (admin@venoai.xyz)

## 🎯 **Resultado Final:**
- **URL:** https://venoai.xyz
- **Email:** admin@venoai.xyz
- **Deploy:** Automático
- **SSL:** Ativado
- **CDN:** Global

**Pronto para usar!** 🎉
