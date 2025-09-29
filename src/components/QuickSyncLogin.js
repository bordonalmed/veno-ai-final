import React, { useState } from 'react';

export default function QuickSyncLogin() {
  const [syncCode, setSyncCode] = useState('');
  const [message, setMessage] = useState('');
  const [showSync, setShowSync] = useState(false);

  const applySyncCode = () => {
    try {
      if (!syncCode.trim()) {
        setMessage('❌ Digite o código de sincronização!');
        return;
      }

      // Buscar código no localStorage
      const syncCodes = JSON.parse(localStorage.getItem('venoai_sync_codes') || '{}');
      const codeData = syncCodes[syncCode];
      
      if (!codeData) {
        setMessage('❌ Código de sincronização inválido!');
        return;
      }

      // Verificar se código expirou
      if (new Date() > new Date(codeData.expiresAt)) {
        setMessage('❌ Código de sincronização expirado!');
        return;
      }

      // Verificar se já foi usado
      if (codeData.used) {
        setMessage('❌ Código de sincronização já foi usado!');
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
      
      setMessage(`✅ Dados sincronizados! Usuário: ${userData.email}`);
      
      // Limpar código após uso
      setSyncCode('');
      
      // Recarregar página após 2 segundos
      setTimeout(() => {
        window.location.reload();
      }, 2000);
      
    } catch (error) {
      setMessage(`❌ Erro: ${error.message}`);
    }
  };

  return (
    <div style={{ marginTop: 15 }}>
      <button
        onClick={() => setShowSync(!showSync)}
        style={{
          background: 'transparent',
          color: '#0eb8d0',
          border: '1px solid #0eb8d0',
          borderRadius: 6,
          padding: '8px 12px',
          fontSize: 12,
          cursor: 'pointer',
          width: '100%'
        }}
      >
        🔄 {showSync ? 'Ocultar' : 'Sincronizar'} com outro navegador
      </button>

      {showSync && (
        <div style={{ 
          marginTop: 10, 
          padding: 15, 
          background: '#1a2332', 
          borderRadius: 8, 
          border: '1px solid #2a3441' 
        }}>
          <p style={{ color: '#ccc', fontSize: 12, marginBottom: 10 }}>
            Digite aqui o código gerado no outro navegador:
          </p>
          
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="text"
              value={syncCode}
              onChange={(e) => setSyncCode(e.target.value.toUpperCase())}
              placeholder="Digite o código aqui..."
              style={{
                flex: 1,
                padding: '8px 10px',
                background: '#2a3441',
                color: '#fff',
                border: '1px solid #4a5568',
                borderRadius: 4,
                fontSize: 12,
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
                borderRadius: 4,
                padding: '8px 12px',
                fontSize: 12,
                cursor: 'pointer'
              }}
            >
              Sincronizar
            </button>
          </div>

          {message && (
            <div style={{
              marginTop: 8,
              padding: 8,
              background: message.includes('✅') ? '#11b58120' : '#ff6b3520',
              color: message.includes('✅') ? '#11b581' : '#ff6b35',
              borderRadius: 4,
              fontSize: 11
            }}>
              {message}
            </div>
          )}

          <p style={{ color: '#999', fontSize: 10, marginTop: 8, marginBottom: 0 }}>
            💡 Para gerar código, vá para /planos no navegador onde você está logado
          </p>
        </div>
      )}
    </div>
  );
}
