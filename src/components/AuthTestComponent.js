import React, { useState, useEffect } from 'react';
import { AuthService } from '../services/authService';
import { SyncServiceUnified } from '../services/syncServiceUnified';

export default function AuthTestComponent() {
  const [userEmail, setUserEmail] = useState('');
  const [userData, setUserData] = useState(null);
  const [testResults, setTestResults] = useState([]);
  const [syncCode, setSyncCode] = useState('');

  useEffect(() => {
    const session = AuthService.getActiveSession();
    if (session) {
      setUserEmail(session.email);
      loadUserData(session.email);
    }
  }, []);

  const loadUserData = (email) => {
    try {
      const data = SyncServiceUnified.getUserData(email);
      setUserData(data);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    }
  };

  const addTestResult = (message, type = 'info') => {
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

  const testEmailNormalization = () => {
    try {
      const testEmails = [
        'VascularGabriel@gmail.com',
        'VASCULARGABRIEL@GMAIL.COM',
        ' vasculargabriel@gmail.com ',
        'VascularGabriel@Gmail.Com'
      ];

      addTestResult('🧪 Testando normalização de email...', 'info');
      
      testEmails.forEach(email => {
        const normalized = AuthService.normalizeEmail(email);
        addTestResult(`"${email}" → "${normalized}"`, 'success');
      });

    } catch (error) {
      addTestResult(`❌ Erro na normalização: ${error.message}`, 'error');
    }
  };

  const testUserExistence = () => {
    try {
      const testEmail = 'vasculargabriel@gmail.com';
      const exists = AuthService.userExists(testEmail);
      addTestResult(`🔍 Usuário "${testEmail}" existe: ${exists}`, exists ? 'success' : 'warning');
    } catch (error) {
      addTestResult(`❌ Erro ao verificar usuário: ${error.message}`, 'error');
    }
  };

  const testLoginIdempotence = () => {
    try {
      addTestResult('🔄 Testando idempotência do login...', 'info');
      
      // Simular múltiplos logins com mesmo email
      const email = 'vasculargabriel@gmail.com';
      const password = '123456';
      
      // Primeiro login
      try {
        const result1 = AuthService.login(email, password);
        addTestResult(`✅ Primeiro login: ${result1.user.email}`, 'success');
      } catch (error) {
        addTestResult(`⚠️ Primeiro login falhou: ${error.message}`, 'warning');
      }
      
      // Segundo login (deve ser idempotente)
      try {
        const result2 = AuthService.login(email, password);
        addTestResult(`✅ Segundo login: ${result2.user.email}`, 'success');
        addTestResult(`🔄 Idempotência: ${result1.user.id === result2.user.id ? 'OK' : 'FALHOU'}`, 
          result1.user.id === result2.user.id ? 'success' : 'error');
      } catch (error) {
        addTestResult(`❌ Segundo login falhou: ${error.message}`, 'error');
      }
      
    } catch (error) {
      addTestResult(`❌ Erro no teste de idempotência: ${error.message}`, 'error');
    }
  };

  const testSyncCodeGeneration = () => {
    try {
      if (!userEmail) {
        addTestResult('❌ Nenhum usuário logado para gerar código', 'error');
        return;
      }

      const code = SyncServiceUnified.generateSyncCode(userEmail);
      setSyncCode(code);
      addTestResult(`✅ Código de sincronização gerado (${code.length} caracteres)`, 'success');
      
    } catch (error) {
      addTestResult(`❌ Erro ao gerar código: ${error.message}`, 'error');
    }
  };

  const testSyncCodeApplication = () => {
    try {
      if (!syncCode) {
        addTestResult('❌ Nenhum código para aplicar', 'error');
        return;
      }

      const result = SyncServiceUnified.applySyncCode(syncCode);
      addTestResult(`✅ Código aplicado: ${result.user.email}`, 'success');
      
    } catch (error) {
      addTestResult(`❌ Erro ao aplicar código: ${error.message}`, 'error');
    }
  };

  const migrateDuplicateUsers = () => {
    try {
      addTestResult('🔄 Iniciando migração de usuários duplicados...', 'info');
      
      const result = AuthService.migrateDuplicateUsers();
      const userCount = Object.keys(result.users).length;
      const profileCount = Object.keys(result.profiles).length;
      
      addTestResult(`✅ Migração concluída: ${userCount} usuários, ${profileCount} perfis`, 'success');
      
    } catch (error) {
      addTestResult(`❌ Erro na migração: ${error.message}`, 'error');
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
        🔧 Teste de Autenticação Idempotente
      </h3>
      
      <div style={{ marginBottom: 15 }}>
        <p style={{ color: '#ccc', margin: '5px 0' }}>
          <strong>Usuário atual:</strong> {userEmail || 'Nenhum'}
        </p>
        {userData && (
          <p style={{ color: '#ccc', margin: '5px 0' }}>
            <strong>ID do usuário:</strong> {userData.user?.id || 'N/A'}
          </p>
        )}
      </div>
      
      <div style={{ marginBottom: 15 }}>
        <button onClick={testEmailNormalization} style={buttonStyle}>
          🧪 Testar Normalização
        </button>
        <button onClick={testUserExistence} style={buttonStyle}>
          🔍 Verificar Usuário
        </button>
        <button onClick={testLoginIdempotence} style={buttonStyle}>
          🔄 Testar Idempotência
        </button>
        <button onClick={testSyncCodeGeneration} style={buttonStyle}>
          📤 Gerar Código Sync
        </button>
        <button onClick={testSyncCodeApplication} style={buttonStyle}>
          📥 Aplicar Código Sync
        </button>
        <button onClick={migrateDuplicateUsers} style={buttonStyle}>
          🔄 Migrar Duplicatas
        </button>
        <button onClick={clearResults} style={{ ...buttonStyle, background: '#6b7280' }}>
          🗑️ Limpar Resultados
        </button>
      </div>
      
      {syncCode && (
        <div style={{ marginBottom: 15 }}>
          <label style={{ color: '#ccc', display: 'block', marginBottom: 5 }}>
            Código de Sincronização:
          </label>
          <textarea
            value={syncCode}
            readOnly
            style={{
              width: '100%',
              height: '60px',
              background: '#2a3441',
              color: '#fff',
              border: '1px solid #4a5568',
              borderRadius: '6px',
              padding: '8px',
              fontSize: '12px',
              fontFamily: 'monospace'
            }}
          />
        </div>
      )}
      
      {testResults.length > 0 && (
        <div>
          <h4 style={{ color: '#0eb8d0', marginBottom: 10 }}>Resultados dos Testes:</h4>
          <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
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






