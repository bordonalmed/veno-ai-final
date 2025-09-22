// Serviço de email para produção
import emailjs from '@emailjs/browser';

export const enviarCodigoVerificacao = async (email, codigo) => {
  try {
    console.log('📧 ENVIANDO EMAIL REAL:');
    console.log('Para:', email);
    console.log('Código:', codigo);
    
    // Configurações do EmailJS (configurado com seus IDs)
    const serviceId = 'service_d4yzpvb'; // Seu Service ID
    const templateId = 'contact_us'; // Template ID (Contact Us)
    const publicKey = 'hgeWbU3HYilvDzJVL'; // Sua Public Key
    
    // Configurações do EmailJS configuradas com sucesso
    
    // Dados do template
    const templateParams = {
      to_email: email,
      verification_code: codigo,
      from_name: 'VENO.AI',
      from_email: 'admin@venoai.xyz',
      message: `Seu código de verificação é: ${codigo}. Válido por 5 minutos.`,
      site_url: 'https://venoai.xyz'
    };
    
    // Enviar email via EmailJS
    const result = await emailjs.send(serviceId, templateId, templateParams, publicKey);
    
    console.log('✅ Email enviado com sucesso!', result);
    return { sucesso: true };
    
  } catch (error) {
    console.error('❌ Erro ao enviar email:', error);
    return { sucesso: false, erro: error.message };
  }
};

// Função para modo desenvolvimento (atual)
export const enviarCodigoDesenvolvimento = (email, codigo) => {
  console.log(`📧 CÓDIGO DE VERIFICAÇÃO (Desenvolvimento)`);
  console.log(`Email: ${email}`);
  console.log(`Código: ${codigo}`);
  
  // Mostrar no alert apenas em desenvolvimento e se permitido
  if (process.env.NODE_ENV === 'development' && process.env.REACT_APP_SHOW_TEST_CODE !== 'false') {
    const mensagem = `📧 CÓDIGO DE VERIFICAÇÃO\n\nEmail: ${email}\nCódigo: ${codigo}\n\n⏰ Válido por 5 minutos\n\n(Modo Desenvolvimento - Em produção seria enviado por email)`;
    alert(mensagem);
  }
  
  return { sucesso: true };
};
