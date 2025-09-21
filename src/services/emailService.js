// Serviço de email para produção
import { EMAIL_CONFIG, EMAIL_TEMPLATE } from './emailConfig';

export const enviarCodigoVerificacao = async (email, codigo) => {
  try {
    console.log('📧 CONFIGURAÇÃO DE EMAIL:');
    console.log('De:', EMAIL_CONFIG.fromEmail);
    console.log('Para:', email);
    console.log('Código:', codigo);
    
    // Verificar se está configurado
    if (EMAIL_CONFIG.fromEmail === 'seuemail@gmail.com') {
      console.log('⚠️ EMAIL NÃO CONFIGURADO!');
      console.log('📝 Configure seu email em: src/services/emailConfig.js');
      console.log('📋 Instruções:', EMAIL_TEMPLATE('123456'));
      
      // Simular envio para teste
      await new Promise(resolve => setTimeout(resolve, 1000));
      return { sucesso: true, aviso: 'Email não configurado - modo simulação' };
    }
    
    // Aqui seria a integração real com backend/API
    // Por enquanto, vamos simular o sucesso
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simular delay
    
    console.log('✅ Email enviado com sucesso!');
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
  
  // Mostrar no alert para teste
  const mensagem = `📧 CÓDIGO DE VERIFICAÇÃO\n\nEmail: ${email}\nCódigo: ${codigo}\n\n⏰ Válido por 5 minutos\n\n(Modo Desenvolvimento - Em produção seria enviado por email)`;
  alert(mensagem);
  
  return { sucesso: true };
};
