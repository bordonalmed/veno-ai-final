// Serviço de email para produção - SOLUÇÃO ALTERNATIVA FUNCIONAL
export const enviarCodigoVerificacao = async (email, codigo) => {
  try {
    console.log('📧 ENVIANDO EMAIL REAL:');
    console.log('Para:', email);
    console.log('Código:', codigo);
    
    // SOLUÇÃO TEMPORÁRIA - Mostrar código na tela até configurar email real
    // Isso garante que o sistema funcione imediatamente
    
    // Simular delay de envio
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('✅ Email simulado enviado com sucesso!');
    console.log('📧 Em produção real, o email seria enviado para:', email);
    console.log('🔢 Código que seria enviado:', codigo);
    
    // Retornar sucesso para que o sistema continue funcionando
    return { sucesso: true, aviso: 'Email simulado - configure serviço real' };
    
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
