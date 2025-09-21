# 📧 CONFIGURAR EMAILJS PARA VENO.AI

## 🎯 **PROBLEMA ATUAL:**
O site venoai.xyz está mostrando a tela azul com código em vez de enviar email real.

## ✅ **SOLUÇÃO: CONFIGURAR EMAILJS**

### **1. Criar Conta no EmailJS:**
- Acesse: https://www.emailjs.com/
- Clique em "Sign Up" (gratuito)
- Faça login com Google/GitHub

### **2. Configurar Serviço de Email:**
- No dashboard, vá em "Email Services"
- Clique em "Add New Service"
- Escolha "Gmail" (ou seu provedor)
- Conecte sua conta Gmail (admin@venoai.xyz)
- **Copie o Service ID** (ex: service_abc123)

### **3. Criar Template de Email:**
- Vá em "Email Templates"
- Clique em "Create New Template"
- **Template ID:** `template_verificacao`
- **Assunto:** `Código de Verificação - VENO.AI`

**Conteúdo do Template:**
```html
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <h1 style="color: #0eb8d0; text-align: center;">VENO.AI</h1>
    <h2>Seu código de verificação:</h2>
    <div style="background: #0eb8d0; color: white; font-size: 36px; font-weight: bold; 
                padding: 20px; text-align: center; border-radius: 10px; letter-spacing: 8px;">
        {{verification_code}}
    </div>
    <p>Este código é válido por <strong>5 minutos</strong></p>
    <p>Se você não solicitou este código, ignore este email.</p>
</div>
```

### **4. Obter Chave Pública:**
- Vá em "Account" → "General"
- **Copie a Public Key** (ex: abc123def456)

### **5. Configurar no Código:**
Abra: `src/services/emailService.js`

Substitua as linhas 11-13:
```javascript
const serviceId = 'SEU_SERVICE_ID_AQUI';
const templateId = 'template_verificacao';
const publicKey = 'SUA_PUBLIC_KEY_AQUI';
```

### **6. Testar:**
- Salve o arquivo
- Faça build: `npm run build`
- Deploy no Netlify
- Teste no site venoai.xyz

## 🚀 **RESULTADO:**
- ✅ Email real enviado para o usuário
- ✅ Código chega na caixa de entrada
- ✅ Sem tela azul em produção
- ✅ Experiência profissional

## 📞 **SUPORTE:**
Se precisar de ajuda, me envie:
- Service ID do EmailJS
- Template ID do EmailJS  
- Public Key do EmailJS

**Configure e teste!** 🎉
