# 📧 CONFIGURAR EMAIL REAL - GUIA COMPLETO

## **PROBLEMA ATUAL:**
- ❌ EmailJS não está enviando emails
- ✅ Sistema funciona com código na tela (temporário)

## **SOLUÇÕES ALTERNATIVAS:**

### **OPÇÃO 1: USAR SENDGRID (RECOMENDADO)**

#### **1. Criar conta no SendGrid:**
- Acesse: https://sendgrid.com/
- Crie uma conta gratuita (100 emails/dia)
- Verifique seu email

#### **2. Obter API Key:**
- Vá em Settings > API Keys
- Clique em "Create API Key"
- Nome: "VENO.AI"
- Permissions: "Full Access"
- Copie a API Key

#### **3. Configurar no código:**
```javascript
// Em src/services/emailService.js
const SENDGRID_API_KEY = 'sua_api_key_aqui';
const SENDGRID_FROM_EMAIL = 'admin@venoai.xyz';
```

### **OPÇÃO 2: USAR NODEMAILER COM GMAIL**

#### **1. Configurar Gmail:**
- Ative "2-Step Verification" no Gmail
- Gere uma "App Password" específica
- Use: admin@venoai.xyz

#### **2. Configurar no código:**
```javascript
// Em src/services/emailService.js
const GMAIL_USER = 'admin@venoai.xyz';
const GMAIL_PASS = 'sua_app_password_aqui';
```

### **OPÇÃO 3: USAR MAILGUN**

#### **1. Criar conta no Mailgun:**
- Acesse: https://www.mailgun.com/
- Crie conta gratuita (10.000 emails/mês)
- Verifique domínio venoai.xyz

#### **2. Obter credenciais:**
- API Key
- Domain
- Configure DNS

### **OPÇÃO 4: USAR RESEND (MAIS SIMPLES)**

#### **1. Criar conta no Resend:**
- Acesse: https://resend.com/
- Crie conta gratuita (3.000 emails/mês)
- Verifique email

#### **2. Obter API Key:**
- Vá em API Keys
- Crie nova chave
- Copie a chave

## **IMPLEMENTAÇÃO RÁPIDA - RESEND:**

### **1. Instalar Resend:**
```bash
npm install resend
```

### **2. Configurar serviço:**
```javascript
import { Resend } from 'resend';

const resend = new Resend('sua_api_key_aqui');

export const enviarCodigoVerificacao = async (email, codigo) => {
  try {
    const { data, error } = await resend.emails.send({
      from: 'VENO.AI <admin@venoai.xyz>',
      to: [email],
      subject: 'Código de Verificação VENO.AI',
      html: `
        <h1>VENO.AI</h1>
        <h2>Código de Verificação</h2>
        <p>Seu código é: <strong>${codigo}</strong></p>
        <p>Válido por 5 minutos.</p>
      `
    });

    if (error) {
      console.error('Erro:', error);
      return { sucesso: false, erro: error.message };
    }

    console.log('Email enviado:', data);
    return { sucesso: true };
  } catch (error) {
    console.error('Erro:', error);
    return { sucesso: false, erro: error.message };
  }
};
```

## **QUAL OPÇÃO ESCOLHER?**

### **MAIS FÁCIL: RESEND**
- ✅ Configuração simples
- ✅ 3.000 emails/mês grátis
- ✅ Funciona imediatamente

### **MAIS ROBUSTA: SENDGRID**
- ✅ 100 emails/dia grátis
- ✅ Muito confiável
- ✅ Boa documentação

### **MAIS ECONÔMICA: GMAIL**
- ✅ Grátis
- ✅ Usa sua conta existente
- ✅ Requer configuração 2FA

## **PRÓXIMOS PASSOS:**

1. **Escolha uma opção** acima
2. **Me diga qual** você prefere
3. **Vou implementar** para você
4. **Sistema funcionará** 100%

## **TEMPORÁRIO:**
- ✅ Sistema funciona com código na tela
- ✅ Usuários podem acessar
- ✅ Não há bloqueios
- 🔄 Email real será configurado depois
