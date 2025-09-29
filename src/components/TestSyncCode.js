import React, { useState } from 'react';

export default function TestSyncCode() {
  const [testResult, setTestResult] = useState('');

  const testGenerateCode = () => {
    try {
      // Simular usuário logado
      localStorage.setItem("userEmail", "teste@example.com");
      localStorage.setItem("userPlano", "trial");
      localStorage.setItem("userPremium", "false");

      // Gerar código de teste
      const timestamp = Date.now().toString(36);
      const random = Math.random().toString(36).substr(2, 8);
      const code = `${timestamp}-${random}-TEST`.toUpperCase();

      // Salvar código
      const syncCodes = JSON.parse(localStorage.getItem('venoai_sync_codes') || '{}');
      syncCodes[code] = {
        userData: {
          email: "teste@example.com",
          plano: "trial",
          premium: false
        },
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        used: false
      };
      localStorage.setItem('venoai_sync_codes', JSON.stringify(syncCodes));

      setTestResult(`✅ Código gerado com sucesso: ${code}`);
    } catch (error) {
      setTestResult(`❌ Erro: ${error.message}`);
    }
  };

  const testApplyCode = () => {
    try {
      const syncCodes = JSON.parse(localStorage.getItem('venoai_sync_codes') || '{}');
      const codes = Object.keys(syncCodes);
      
      if (codes.length === 0) {
        setTestResult('❌ Nenhum código encontrado. Gere um código primeiro.');
        return;
      }

      const firstCode = codes[0];
      const codeData = syncCodes[firstCode];
      
      if (codeData.used) {
        setTestResult('❌ Código já foi usado.');
        return;
      }

      // Marcar como usado
      codeData.used = true;
      syncCodes[firstCode] = codeData;
      localStorage.setItem('venoai_sync_codes', JSON.stringify(syncCodes));

      setTestResult(`✅ Código aplicado: ${firstCode} - Usuário: ${codeData.userData.email}`);
    } catch (error) {
      setTestResult(`❌ Erro: ${error.message}`);
    }
  };

  const clearTestData = () => {
    localStorage.removeItem('venoai_sync_codes');
    setTestResult('🧹 Dados de teste limpos');
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
        🧪 Teste de Geração de Código
      </h3>
      
      <div style={{ marginBottom: 15 }}>
        <button onClick={testGenerateCode} style={buttonStyle}>
          🔑 Gerar Código de Teste
        </button>
        <button onClick={testApplyCode} style={buttonStyle}>
          📥 Aplicar Código de Teste
        </button>
        <button onClick={clearTestData} style={{ ...buttonStyle, background: '#6b7280' }}>
          🗑️ Limpar Dados
        </button>
      </div>

      {testResult && (
        <div style={{
          padding: '12px 16px',
          borderRadius: '8px',
          background: testResult.includes('✅') ? '#11b58120' : '#ff6b3520',
          color: testResult.includes('✅') ? '#11b581' : '#ff6b35',
          border: `1px solid ${testResult.includes('✅') ? '#11b58140' : '#ff6b3540'}`,
          fontSize: '14px',
          fontFamily: 'monospace'
        }}>
          {testResult}
        </div>
      )}

      <div style={{ marginTop: 15, fontSize: '12px', color: '#999' }}>
        <strong>Como testar:</strong><br/>
        1. Clique "Gerar Código de Teste"<br/>
        2. Clique "Aplicar Código de Teste"<br/>
        3. Verifique se funcionou
      </div>
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
