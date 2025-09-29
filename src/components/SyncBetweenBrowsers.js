import React, { useState } from 'react';

export default function SyncBetweenBrowsers() {
  const [syncCode, setSyncCode] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('info');

  const showMessage = (text, type = 'info') => {
    setMessage(text);
    setMessageType(type);
    setTimeout(() => setMessage(''), 5000);
  };

  const generateSyncCode = () => {
    try {
      // Verificar se há usuário logado no sistema atual
      const userEmail = localStorage.getItem("userEmail");
      if (!userEmail) {
        showMessage('❌ Você precisa estar logado para gerar código de sincronização!', 'error');
        return;
      }

      // Criar dados do usuário para sincronização
      const userData = {
        email: userEmail,
        plano: localStorage.getItem("userPlano") || "trial",
        premium: localStorage.getItem("userPremium") === "true",
        trialStatus: {
          inicio: new Date().toISOString(),
          laudosGerados: [],
          status: localStorage.getItem("userPremium") === "true" ? "premium" : "active"
        }
      };

      // Gerar código simples
      const timestamp = Date.now().toString(36);
      const random = Math.random().toString(36).substr(2, 8);
      const code = `${timestamp}-${random}-${userEmail.substr(0, 4)}`.toUpperCase();

      // Salvar código no localStorage
      const syncCodes = JSON.parse(localStorage.getItem('venoai_sync_codes') || '{}');
      syncCodes[code] = {
        userData: userData,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hora
        used: false
      };
      localStorage.setItem('venoai_sync_codes', JSON.stringify(syncCodes));

      setGeneratedCode(code);
      showMessage('✅ Código de sincronização gerado com sucesso!', 'success');
    } catch (error) {
      showMessage(`❌ Erro ao gerar código: ${error.message}`, 'error');
    }
  };

  const applySyncCode = () => {
    try {
      if (!syncCode.trim()) {
        showMessage('❌ Digite o código de sincronização!', 'error');
        return;
      }

      // Buscar código no localStorage
      const syncCodes = JSON.parse(localStorage.getItem('venoai_sync_codes') || '{}');
      const codeData = syncCodes[syncCode];
      
      if (!codeData) {
        showMessage('❌ Código de sincronização inválido!', 'error');
        return;
      }

      // Verificar se código expirou
      if (new Date() > new Date(codeData.expiresAt)) {
        showMessage('❌ Código de sincronização expirado!', 'error');
        return;
      }

      // Verificar se já foi usado
      if (codeData.used) {
        showMessage('❌ Código de sincronização já foi usado!', 'error');
        return;
      }

      // Marcar como usado
      codeData.used = true;
      codeData.usedAt = new Date().toISOString();
      syncCodes[syncCode] = codeData;
      localStorage.setItem('venoai_sync_codes', JSON.stringify(syncCodes));

      // Aplicar dados do usuário
      const userData = codeData.userData;
      localStorage.setItem("userEmail", userData.email);
      localStorage.setItem("userPlano", userData.plano);
      localStorage.setItem("userPremium", userData.premium.toString());
      
      showMessage(`✅ Dados sincronizados com sucesso! Usuário: ${userData.email}`, 'success');
      
      // Limpar código após uso
      setSyncCode('');
      
      // Recarregar página para aplicar mudanças
      setTimeout(() => {
        window.location.reload();
      }, 2000);
      
    } catch (error) {
      showMessage(`❌ Erro ao aplicar código: ${error.message}`, 'error');
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      showMessage('📋 Código copiado para a área de transferência!', 'success');
    }).catch(() => {
      showMessage('❌ Erro ao copiar código', 'error');
    });
  };

  const getMessageStyle = () => {
    const baseStyle = {
      padding: '12px 16px',
      borderRadius: '8px',
      marginBottom: '16px',
      fontWeight: '500',
      fontSize: '14px'
    };

    switch (messageType) {
      case 'success':
        return { ...baseStyle, background: '#11b58120', color: '#11b581', border: '1px solid #11b58140' };
      case 'error':
        return { ...baseStyle, background: '#ff6b3520', color: '#ff6b35', border: '1px solid #ff6b3540' };
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
        🔄 Sincronizar Entre Navegadores
      </h3>
      
      <p style={{ color: '#ccc', marginBottom: 20, fontSize: '14px', lineHeight: '1.5' }}>
        Use esta ferramenta para sincronizar seus dados entre diferentes navegadores (Chrome, Edge, Firefox, etc.).
        <br/><br/>
        <strong>Como usar:</strong>
        <br/>1. No navegador onde você está logado, gere um código
        <br/>2. No outro navegador, cole o código para sincronizar
      </p>

      {message && (
        <div style={getMessageStyle()}>
          {message}
        </div>
      )}

      {/* Gerar Código */}
      <div style={{ marginBottom: 20 }}>
        <h4 style={{ color: '#fff', marginBottom: 10 }}>📤 Gerar Código de Sincronização</h4>
        <p style={{ color: '#999', fontSize: '12px', marginBottom: 10 }}>
          Use este código no outro navegador para sincronizar seus dados
        </p>
        
        <button 
          onClick={generateSyncCode}
          style={{
            background: '#0eb8d0',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            padding: '10px 16px',
            fontWeight: 600,
            cursor: 'pointer',
            marginBottom: 10
          }}
        >
          🔑 Gerar Código
        </button>

        {generatedCode && (
          <div style={{ marginTop: 10 }}>
            <label style={{ color: '#ccc', display: 'block', marginBottom: 5 }}>
              Código gerado (copie este código):
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              <textarea
                value={generatedCode}
                readOnly
                style={{
                  flex: 1,
                  height: '60px',
                  background: '#2a3441',
                  color: '#fff',
                  border: '1px solid #4a5568',
                  borderRadius: 6,
                  padding: 8,
                  fontSize: 12,
                  fontFamily: 'monospace',
                  resize: 'none'
                }}
              />
              <button
                onClick={() => copyToClipboard(generatedCode)}
                style={{
                  background: '#11b581',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 6,
                  padding: '8px 12px',
                  cursor: 'pointer',
                  fontSize: 12
                }}
              >
                📋 Copiar
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Aplicar Código */}
      <div>
        <h4 style={{ color: '#fff', marginBottom: 10 }}>📥 Aplicar Código de Sincronização</h4>
        <p style={{ color: '#999', fontSize: '12px', marginBottom: 10 }}>
          Digite aqui o código gerado no outro navegador (não precisa colar, pode digitar)
        </p>
        
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            type="text"
            value={syncCode}
            onChange={(e) => setSyncCode(e.target.value.toUpperCase())}
            placeholder="Digite o código aqui..."
            style={{
              flex: 1,
              padding: '10px 12px',
              background: '#2a3441',
              color: '#fff',
              border: '1px solid #4a5568',
              borderRadius: 6,
              fontSize: 14,
              textTransform: 'uppercase',
              fontFamily: 'monospace',
              letterSpacing: '1px'
            }}
          />
          <button
            onClick={applySyncCode}
            style={{
              background: '#11b581',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              padding: '10px 16px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            🔄 Sincronizar
          </button>
        </div>
      </div>

      {/* Instruções */}
      <div style={{ 
        marginTop: 20, 
        padding: 15, 
        background: '#2a3441', 
        borderRadius: 8,
        border: '1px solid #4a5568'
      }}>
        <h5 style={{ color: '#0eb8d0', marginBottom: 10 }}>📋 Instruções Detalhadas:</h5>
        <ol style={{ color: '#ccc', fontSize: '13px', lineHeight: '1.6', margin: 0, paddingLeft: 20 }}>
          <li><strong>No navegador onde você está logado:</strong> Gere um código de sincronização</li>
          <li><strong>Anote o código</strong> que aparece (ex: ABC123-DEF456-TEST)</li>
          <li><strong>No outro navegador:</strong> Digite o código e clique em "🔄 Sincronizar"</li>
          <li><strong>Aguarde</strong> a página recarregar automaticamente</li>
          <li><strong>Pronto!</strong> Seus dados estarão sincronizados</li>
        </ol>
      </div>
    </div>
  );
}
