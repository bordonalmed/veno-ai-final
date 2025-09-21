# 🩺 VENO.AI - Gerador de Laudos Doppler Vascular Inteligente

![VENO.AI Logo](https://via.placeholder.com/400x100/0eb8d0/ffffff?text=VENO.AI)

## 🎯 **Sobre o Projeto**

O VENO.AI é um sistema inteligente para geração de laudos de exames Doppler Vascular, desenvolvido com React e tecnologias modernas.

## ✨ **Funcionalidades**

- 🔐 **Sistema de Login Seguro** com verificação de email
- 📧 **Verificação de Email** com códigos de 6 dígitos
- 🩺 **Geração de Laudos** Doppler Vascular
- 📄 **Exportação em PDF** com imagens
- 🎨 **Interface Moderna** e responsiva
- 🔒 **Autenticação Robusta** com validação de email

## 🚀 **Tecnologias Utilizadas**

- **React 18** - Framework principal
- **React Router** - Navegação
- **React Icons** - Ícones
- **jsPDF** - Geração de PDFs
- **PDF-lib** - Manipulação de PDFs
- **File-saver** - Download de arquivos

## 📦 **Instalação**

### **Pré-requisitos:**
- Node.js 16+ 
- npm ou yarn

### **Instalação:**
```bash
# Clone o repositório
git clone https://github.com/SEU_USUARIO/veno-ai.git

# Entre na pasta
cd veno-ai

# Instale as dependências
npm install

# Execute o projeto
npm start
```

## 🌐 **Deploy**

### **GitHub Pages:**
```bash
npm run deploy
```

### **Netlify/Vercel:**
- Conecte o repositório
- Deploy automático

### **Domínio Personalizado:**
- Configure `venoai.xyz`
- SSL automático

## 📧 **Configuração de Email**

### **Desenvolvimento:**
- Códigos aparecem na tela
- Perfeito para testes

### **Produção:**
- Configure em `src/services/emailConfig.js`
- Use `admin@venoai.xyz`
- Gere senha de app do Gmail

## 🔧 **Estrutura do Projeto**

```
src/
├── components/          # Componentes reutilizáveis
├── pages/              # Páginas da aplicação
│   ├── Login.js        # Tela de login
│   ├── Home.js         # Página principal
│   └── VerificacaoEmail.js # Verificação de email
├── services/           # Serviços
│   ├── emailService.js # Serviço de email
│   └── emailConfig.js  # Configuração de email
├── styles/             # Estilos CSS
└── utils/              # Utilitários
```

## 🎨 **Interface**

### **Tela de Login:**
- Validação de email em tempo real
- Verificação de senha
- Design moderno e responsivo

### **Verificação de Email:**
- Código de 6 dígitos
- Timer de 5 minutos
- Reenvio de código

### **Página Principal:**
- Geração de laudos
- Exportação em PDF
- Interface intuitiva

## 🔒 **Segurança**

- Validação robusta de email
- Códigos de verificação temporários
- Autenticação por sessão
- Dados armazenados localmente

## 📱 **Responsividade**

- Design adaptável para mobile
- Interface otimizada para tablets
- Compatível com todos os dispositivos

## 🚀 **Deploy em Produção**

### **URL:**
- **Desenvolvimento:** http://localhost:3000
- **Produção:** https://venoai.xyz

### **Email:**
- **Desenvolvimento:** Códigos na tela
- **Produção:** admin@venoai.xyz

## 📄 **Licença**

MIT License - veja o arquivo [LICENSE](LICENSE) para detalhes.

## 👨‍💻 **Autor**

**Gabriel Bordonal**
- Desenvolvedor Full Stack
- Especialista em React
- Criador do VENO.AI

## 🤝 **Contribuição**

1. Fork o projeto
2. Crie uma branch (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📞 **Suporte**

Para suporte, entre em contato:
- **Email:** admin@venoai.xyz
- **GitHub:** [Issues](https://github.com/SEU_USUARIO/veno-ai/issues)

---

**Desenvolvido com ❤️ para a medicina vascular** 🩺