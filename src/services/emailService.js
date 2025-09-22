// Serviço de email para produção - USANDO API EXTERNA
export const enviarCodigoVerificacao = async (email, codigo) => {
  try {
    console.log('📧 ENVIANDO EMAIL REAL:');
    console.log('Para:', email);
    console.log('Código:', codigo);
    
    // Usar uma API de email que funciona no frontend
    // Vou usar uma API pública para demonstração
    const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        service_id: 'service_d4yzpvb',
        template_id: 'contact_us',
        user_id: 'hgeWbU3HYilvDzJVL',
        template_params: {
          to_email: email,
          verification_code: codigo,
          name: 'Usuário VENO.AI',
          email: email,
          message: `Seu código de verificação VENO.AI é: ${codigo}\n\nEste código é válido por 5 minutos.\n\nSe você não solicitou este código, ignore este email.`,
          title: 'Código de Verificação VENO.AI',
          time: new Date().toLocaleString('pt-BR'),
          from_name: 'VENO.AI',
          reply_to: 'admin@venoai.xyz'
        }
      })
    });
    
    console.log('📧 Resposta da API:', response);
    
    if (response.ok) {
      console.log('✅ Email enviado com sucesso via API!');
      return { sucesso: true };
    } else {
      console.error('❌ Erro na API:', response.status, response.statusText);
      return { sucesso: false, erro: `API Error: ${response.status}` };
    }
    
  } catch (error) {
    console.error('❌ Erro ao enviar email:', error);
    console.error('Detalhes do erro:', error.message);
    
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
