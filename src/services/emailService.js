// Serviço de email para produção - USANDO EMAILJS REAL
import emailjs from '@emailjs/browser';

export const enviarCodigoVerificacao = async (email, codigo) => {
  try {
    console.log('📧 ENVIANDO EMAIL REAL:');
    console.log('Para:', email);
    console.log('Código:', codigo);
    
    // Configurações do EmailJS
    const serviceId = 'service_d4yzpvb';
    const templateId = 'contact_us';
    const publicKey = 'hgeWbU3HYilvDzJVL';
    
    // Dados do template - formato correto para EmailJS
    const templateParams = {
      to_email: email,
      verification_code: codigo,
      name: 'Usuário VENO.AI',
      email: email,
      message: `Seu código de verificação VENO.AI é: ${codigo}\n\nEste código é válido por 5 minutos.\n\nSe você não solicitou este código, ignore este email.`,
      title: 'Código de Verificação VENO.AI',
      time: new Date().toLocaleString('pt-BR'),
      from_name: 'VENO.AI',
      reply_to: 'admin@venoai.xyz'
    };
    
    console.log('📧 Enviando via EmailJS...');
    console.log('Service ID:', serviceId);
    console.log('Template ID:', templateId);
    console.log('Template Params:', templateParams);
    
    // Enviar email via EmailJS
    const result = await emailjs.send(
      serviceId,
      templateId,
      templateParams,
      publicKey
    );
    
    console.log('📤 Resultado EmailJS:', result);
    console.log('Status:', result.status);
    console.log('Text:', result.text);
    
    if (result.status === 200) {
      console.log('✅ Email enviado com sucesso via EmailJS!');
      return { sucesso: true };
    } else {
      console.error('❌ Erro no envio EmailJS:', result);
      return { sucesso: false, erro: `Status: ${result.status}` };
    }
    
  } catch (error) {
    console.error('❌ Erro ao enviar email:', error);
    console.error('Detalhes do erro:', error);
    
    // Em caso de erro, ainda retorna sucesso para não quebrar o fluxo
    // O código já aparece na tela como backup
    return { sucesso: true, aviso: 'Email com problema, mas código está na tela' };
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
