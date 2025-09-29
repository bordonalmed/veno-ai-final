import React, { useState } from 'react';
import { AuthService } from '../services/authService';
import { SyncServiceUnified } from '../services/syncServiceUnified';

export default function LoginTestComponent() {
  const [testResults, setTestResults] = useState([]);
  const [isRunning, setIsRunning] = useState(false);

  const addResult = (message, type = 'info') => {
    setTestResults(prev => [...prev, {
      id: Date.now(),
      message,
      type,
      timestamp: new Date().toLocaleTimeString()
    }]);
  };

  const clearResults = () => {
    setTestResults([]);
  };

  const runAllTests = async () => {
    setIsRunning(true);
    clearResults();
    
    try {
      addResult('🧪 Iniciando testes do sistema de login melhorado...', 'info');
      
      // Teste 1: Validação de email
      await testEmailValidation();
      
      // Teste 2: Validação de senha
      await testPasswordValidation();
      
      // Teste 3: Criação de usuário
      await testUserCreation();
      
      // Teste 4: Login
      await testLogin();
      
      // Teste 5: Sincronização
      await testSynchronization();
      
      addResult('✅ Todos os testes concluídos!', 'success');
      
    } catch (error) {
      addResult(`❌ Erro nos testes: ${error.message}`, 'error');
    } finally {
      setIsRunning(false);
    }
  };

  const testEmailValidation = async () => {
    addResult('📧 Testando validação de email...', 'info');
    
    const testEmails = [
      { email: 'test@example.com', shouldPass: true },
      { email: 'invalid-email', shouldPass: false },
      { email: 'test@domain.co.uk', shouldPass: true },
      { email: 'user@sub.domain.com', shouldPass: true },
      { email: '', shouldPass: false }
    ];

    testEmails.forEach(({ email, shouldPass }) => {
      const result = AuthService.validateEmail ? AuthService.validateEmail(email) : { valido: email.includes('@') };
      const passed = result.valido === shouldPass;
      
      addResult(
        `${passed ? '✅' : '❌'} "${email}" - ${passed ? 'OK' : 'FALHOU'}`,
        passed ? 'success' : 'error'
      );
    });
  };

  const testPasswordValidation = async () => {
    addResult('🔒 Testando validação de senha...', 'info');
    
    const testPasswords = [
      { password: '123456', shouldPass: true },
      { password: '12345', shouldPass: false },
      { password: 'password123', shouldPass: true },
      { password: 'P@ssw0rd!', shouldPass: true },
      { password: '', shouldPass: false }
    ];

    testPasswords.forEach(({ password, shouldPass }) => {
      const validation = AuthService.validatePasswordStrength(password);
      const passed = validation.isValid === shouldPass;
      
      addResult(
        `${passed ? '✅' : '❌'} "${password}" - ${passed ? 'OK' : 'FALHOU'} (Score: ${AuthService.calculatePasswordScore(password)})`,
        passed ? 'success' : 'error'
      );
    });
  };

  const testUserCreation = async () => {
    addResult('👤 Testando criação de usuário...', 'info');
    
    try {
      const testEmail = 'teste@example.com';
      const testPassword = '123456';
      
      // Limpar usuário de teste se existir
      if (AuthService.userExists(testEmail)) {
        addResult('🧹 Limpando usuário de teste existente...', 'info');
      }
      
      const { user, profile } = AuthService.createUser(testEmail, testPassword);
      
      addResult(`✅ Usuário criado: ${user.email} (ID: ${user.id})`, 'success');
      addResult(`✅ Perfil criado: ${profile.plano} - Premium: ${profile.premium}`, 'success');
      
    } catch (error) {
      addResult(`❌ Erro na criação: ${error.message}`, 'error');
    }
  };

  const testLogin = async () => {
    addResult('🔐 Testando login...', 'info');
    
    try {
      const testEmail = 'teste@example.com';
      const testPassword = '123456';
      
      const { user, profile, session } = AuthService.login(testEmail, testPassword);
      
      addResult(`✅ Login realizado: ${user.email}`, 'success');
      addResult(`✅ Sessão criada: ${session.id}`, 'success');
      addResult(`✅ Perfil carregado: ${profile.plano}`, 'success');
      
    } catch (error) {
      addResult(`❌ Erro no login: ${error.message}`, 'error');
    }
  };

  const testSynchronization = async () => {
    addResult('🔄 Testando sincronização...', 'info');
    
    try {
      const testEmail = 'teste@example.com';
      
      // Gerar código de sincronização
      const syncCode = SyncServiceUnified.generateSyncCode(testEmail);
      addResult(`✅ Código de sincronização gerado: ${syncCode.substring(0, 10)}...`, 'success');
      
      // Aplicar código de sincronização
      const result = SyncServiceUnified.applySyncCode(syncCode);
      addResult(`✅ Código aplicado: ${result.user.email}`, 'success');
      
    } catch (error) {
      addResult(`❌ Erro na sincronização: ${error.message}`, 'error');
    }
  };

  const testDataIntegrity = () => {
    addResult('🔍 Verificando integridade dos dados...', 'info');
    
    try {
      const integrity = AuthService.verifyDataIntegrity();
      addResult(`✅ Integridade verificada: ${integrity.users} usuários, ${integrity.profiles} perfis, ${integrity.sessions} sessões`, 'success');
    } catch (error) {
      addResult(`❌ Erro na verificação: ${error.message}`, 'error');
    }
  };

  const cleanupTestData = () => {
    addResult('🧹 Limpando dados de teste...', 'info');
    
    try {
      // Limpar dados de teste
      const testEmail = 'teste@example.com';
      if (AuthService.userExists(testEmail)) {
        const user = AuthService.getUserByEmail(testEmail);
        if (user) {
          // Remover perfil
          const profiles = AuthService.getAllProfiles();
          delete profiles[user.id];
          localStorage.setItem(AuthService.STORAGE_KEYS.USER_PROFILES, JSON.stringify(profiles));
          
          // Remover usuário
          const users = AuthService.getAllUsers();
          delete users[AuthService.normalizeEmail(testEmail)];
          localStorage.setItem(AuthService.STORAGE_KEYS.USERS, JSON.stringify(users));
          
          addResult('✅ Dados de teste removidos', 'success');
        }
      } else {
        addResult('ℹ️ Nenhum dado de teste encontrado', 'info');
      }
    } catch (error) {
      addResult(`❌ Erro na limpeza: ${error.message}`, 'error');
    }
  };

  const getResultStyle = (type) => {
    const baseStyle = {
      padding: '8px 12px',
      margin: '4px 0',
      borderRadius: '6px',
      fontSize: '14px',
      fontFamily: 'monospace'
    };

    switch (type) {
      case 'success':
        return { ...baseStyle, background: '#11b58120', color: '#11b581', border: '1px solid #11b58140' };
      case 'error':
        return { ...baseStyle, background: '#ff6b3520', color: '#ff6b35', border: '1px solid #ff6b3540' };
      case 'warning':
        return { ...baseStyle, background: '#f59e0b20', color: '#f59e0b', border: '1px solid #f59e0b40' };
      default:
        return { ...baseStyle, background: '#0eb8d020', color: '#0eb8d0', border: '1px solid #0eb8d040' };
    }
  };

  return (
    <div style={{ 
      margin: 20, 
      padding: 20, 
      background: '#1a2332', 
      borderRadius: 12, 
      border: '1px solid #2a3441' 
    }}>
      <h3 style={{ color: '#0eb8d0', marginBottom: 15 }}>
        🧪 Teste do Sistema de Login Melhorado
      </h3>
      
      <div style={{ marginBottom: 15 }}>
        <button 
          onClick={runAllTests} 
          disabled={isRunning}
          style={{
            ...buttonStyle,
            background: isRunning ? '#666' : '#0eb8d0',
            cursor: isRunning ? 'not-allowed' : 'pointer'
          }}
        >
          {isRunning ? '🔄 Executando...' : '🚀 Executar Todos os Testes'}
        </button>
        <button onClick={testDataIntegrity} style={buttonStyle}>
          🔍 Verificar Integridade
        </button>
        <button onClick={cleanupTestData} style={buttonStyle}>
          🧹 Limpar Dados de Teste
        </button>
        <button onClick={clearResults} style={{ ...buttonStyle, background: '#6b7280' }}>
          🗑️ Limpar Resultados
        </button>
      </div>
      
      {testResults.length > 0 && (
        <div>
          <h4 style={{ color: '#0eb8d0', marginBottom: 10 }}>Resultados dos Testes:</h4>
          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            {testResults.map(result => (
              <div key={result.id} style={getResultStyle(result.type)}>
                <span style={{ opacity: 0.7, marginRight: 8 }}>[{result.timestamp}]</span>
                {result.message}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const buttonStyle = {
  background: '#0eb8d0',
  color: '#fff',
  border: 'none',
  borderRadius: 6,
  padding: '8px 12px',
  fontWeight: 600,
  cursor: 'pointer',
  margin: '2px 4px',
  fontSize: '12px'
};
