// Configuração de Email - Fácil de Personalizar

export const EMAIL_CONFIG = {
  // Seu email de envio
  fromEmail: 'admin@venoai.xyz',
  fromName: 'VENO.AI',
  
  // Configurações do servidor (Gmail)
  smtp: {
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: 'admin@venoai.xyz',
      pass: 'sua_senha_app' // SUBSTITUA AQUI (senha de app do Gmail)
    }
  }
};

// Template do email
export const EMAIL_TEMPLATE = (codigo) => `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Código de Verificação - VENO.AI</title>
</head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #0eb8d0; margin: 0;">VENO.AI</h1>
        <p style="color: #666; margin: 5px 0;">Gerador de Laudos Doppler Vascular Inteligente</p>
    </div>
    
    <div style="background: #f8f9fa; padding: 30px; border-radius: 10px; margin: 20px 0; text-align: center;">
        <h2 style="color: #333; margin-top: 0;">Seu código de verificação:</h2>
        <div style="background: #0eb8d0; color: white; font-size: 36px; font-weight: bold; 
                    padding: 20px; border-radius: 10px; letter-spacing: 8px; margin: 20px 0;">
            ${codigo}
        </div>
        <p style="color: #666; font-size: 16px; margin: 0;">
            Este código é válido por <strong>5 minutos</strong>
        </p>
    </div>
    
    <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <p style="color: #856404; margin: 0; font-size: 14px;">
            <strong>⚠️ Importante:</strong> Se você não solicitou este código, ignore este email.
        </p>
    </div>
    
    <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
    <p style="color: #999; font-size: 12px; text-align: center; margin: 0;">
        VENO.AI - Sistema de Laudos Médicos Inteligentes<br>
        Este é um email automático, não responda.
    </p>
</body>
</html>
`;

// Instruções para configurar
export const INSTRUCOES_CONFIG = `
📧 CONFIGURAÇÃO DE EMAIL - VENO.AI

✅ EMAIL CONFIGURADO: admin@venoai.xyz

1. CONFIGURAÇÃO ATUAL:
   - fromEmail: 'admin@venoai.xyz' ✅
   - fromName: 'VENO.AI' ✅
   - auth.user: 'admin@venoai.xyz' ✅

2. PRÓXIMO PASSO - Senha de App:
   - Acesse: https://myaccount.google.com/security
   - Ative "Verificação em duas etapas"
   - Gere uma "Senha de app" para "Outro"
   - Substitua 'sua_senha_app' pela senha gerada

3. CONFIGURAÇÃO SMTP:
   - Host: smtp.gmail.com ✅
   - Porta: 587 ✅
   - Seguro: false ✅

4. TESTE O ENVIO E PRONTO! 🚀
`;


