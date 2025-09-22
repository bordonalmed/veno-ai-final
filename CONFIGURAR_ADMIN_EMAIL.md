# 📧 CONFIGURAÇÃO EMAILJS - admin@venoai.xyz

## 🎯 **CONFIGURAÇÃO ESPECÍFICA PARA SEU EMAIL**

### **1. ACESSE O EMAILJS:**
- Vá em: https://www.emailjs.com/
- Clique em "Sign Up" (gratuito)
- Faça login com Google

### **2. CONFIGURE O SERVIÇO GMAIL:**
- No dashboard, vá em "Email Services"
- Clique em "Add New Service"
- Escolha "Gmail"
- **Email:** `admin@venoai.xyz`
- **Senha:** Sua senha do Gmail (ou senha de app)
- **Nome do Serviço:** `service_venoai`
- **Copie o Service ID** (ex: service_abc123)

### **3. CRIE O TEMPLATE DE EMAIL:**
- Vá em "Email Templates"
- Clique em "Create New Template"
- **Template ID:** `template_verificacao`
- **Assunto:** `Código de Verificação - VENO.AI`

**Conteúdo do Template:**
```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Código de Verificação - VENO.AI</title>
</head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f4f4f4;">
    
    <!-- Header -->
    <div style="text-align: center; margin-bottom: 30px; background: linear-gradient(120deg,#101824 0%,#1c2740 100%); padding: 30px; border-radius: 10px;">
        <h1 style="color: #0eb8d0; margin: 0; font-size: 32px;">VENO.AI</h1>
        <p style="color: #ccc; margin: 10px 0 0 0; font-size: 16px;">Gerador de Laudos Doppler Vascular Inteligente</p>
    </div>
    
    <!-- Conteúdo Principal -->
    <div style="background: white; padding: 40px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <h2 style="color: #333; margin-top: 0; text-align: center;">Seu código de verificação:</h2>
        
        <!-- Código -->
        <div style="background: #0eb8d0; color: white; font-size: 36px; font-weight: bold; 
                    padding: 25px; text-align: center; border-radius: 10px; letter-spacing: 8px; 
                    margin: 30px 0; box-shadow: 0 4px 15px rgba(14, 184, 208, 0.3);">
            {{verification_code}}
        </div>
        
        <p style="color: #666; font-size: 16px; text-align: center; margin: 20px 0;">
            Este código é válido por <strong style="color: #0eb8d0;">5 minutos</strong>
        </p>
        
        <p style="color: #666; font-size: 14px; text-align: center; margin: 20px 0;">
            Digite este código na tela de verificação para acessar o VENO.AI
        </p>
    </div>
    
    <!-- Aviso de Segurança -->
    <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p style="color: #856404; margin: 0; font-size: 14px; text-align: center;">
            <strong>⚠️ Importante:</strong> Se você não solicitou este código, ignore este email.
        </p>
    </div>
    
    <!-- Footer -->
    <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
        <p style="color: #999; font-size: 12px; margin: 0;">
            VENO.AI - Sistema de Laudos Médicos Inteligentes<br>
            Email enviado de: admin@venoai.xyz<br>
            Site: https://venoai.xyz
        </p>
    </div>
    
</body>
</html>
```

### **4. OBTER CHAVE PÚBLICA:**
- Vá em "Account" → "General"
- **Copie a Public Key** (ex: abc123def456)

### **5. CONFIGURAR NO CÓDIGO:**
Abra: `src/services/emailService.js`

Substitua as linhas 11-13:
```javascript
const serviceId = 'SEU_SERVICE_ID_AQUI';        // Do EmailJS
const templateId = 'template_verificacao';      // Criado por você
const publicKey = 'SUA_PUBLIC_KEY_AQUI';       // Do EmailJS
```

### **6. TESTAR:**
- Salve o arquivo
- Faça build: `npm run build`
- Deploy automático no Netlify
- Teste em venoai.xyz

## ✅ **RESULTADO ESPERADO:**
- **De:** admin@venoai.xyz
- **Assunto:** Código de Verificação - VENO.AI
- **Design:** Profissional com logo VENO.AI
- **Código:** 6 dígitos em destaque
- **Validade:** 5 minutos

## 🚀 **PRÓXIMOS PASSOS:**
1. Configure o EmailJS com admin@venoai.xyz
2. Me envie os IDs para eu configurar no código
3. Teste o envio de email
4. Deploy final

**Configure e me avise quando estiver pronto!** 🎉
