import React, { useState } from 'react';
import { SyncServiceSafe } from '../services/syncServiceSafe';
import { TrialManagerSafe } from '../utils/trialManagerSafe';

export default function SyncTestButton() {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');

  const testSync = async () => {
    const userEmail = localStorage.getItem("userEmail");
    if (!userEmail) {
      alert("❌ Nenhum usuário logado!");
      return;
    }

    setIsLoading(true);
    setMessage('');

    try {
      // Testar sincronização
      console.log('🧪 Testando sincronização...');
      
      // Obter dados locais
      const localData = {
        plano: TrialManagerSafe.verificarPlanoUsuario(userEmail),
        trialStatus: TrialManagerSafe.obterStatusTrial(userEmail),
        transacao: localStorage.getItem(`transacao_${userEmail}`)
      };
      
      console.log('📊 Dados locais:', localData);
      
      // Sincronizar com servidor
      const syncedData = SyncServiceSafe.syncUserData(userEmail, localData);
      
      console.log('🔄 Dados sincronizados:', syncedData);
      
      // Aplicar dados sincronizados
      if (syncedData.plano) {
        localStorage.setItem(`plano_${userEmail}`, syncedData.plano);
      }
      
      if (syncedData.trialStatus) {
        localStorage.setItem(`trial_${userEmail}`, JSON.stringify(syncedData.trialStatus));
      }
      
      if (syncedData.transacao) {
        localStorage.setItem(`transacao_${userEmail}`, syncedData.transacao);
      }
      
      setMessage('✅ Sincronização testada com sucesso!');
      alert(`✅ Sincronização testada com sucesso!\n\nDados sincronizados para: ${userEmail}\n\nAgora teste em outro dispositivo!`);
      
    } catch (error) {
      console.error('Erro no teste de sincronização:', error);
      setMessage('❌ Erro na sincronização: ' + error.message);
      alert('❌ Erro na sincronização. Verifique o console para mais detalhes.');
    } finally {
      setIsLoading(false);
    }
  };

  const activatePremium = async () => {
    const userEmail = localStorage.getItem("userEmail");
    if (!userEmail) {
      alert("❌ Nenhum usuário logado!");
      return;
    }

    setIsLoading(true);
    setMessage('');

    try {
      // Ativar Premium no servidor
      const success = SyncServiceSafe.activatePremiumOnServer(userEmail, {
        transactionId: `SYNC_TEST_${Date.now()}`,
        dataAtivacao: new Date().toISOString(),
        status: 'active'
      });
      
      if (success) {
        // Ativar Premium localmente
        TrialManagerSafe.definirPlanoUsuario(userEmail, 'premium');
        
        setMessage('✅ Premium ativado com sincronização!');
        alert(`✅ Premium ativado com sincronização para: ${userEmail}\n\nAgora teste em outro dispositivo!`);
      } else {
        throw new Error('Falha ao ativar Premium no servidor');
      }
      
    } catch (error) {
      console.error('Erro ao ativar Premium:', error);
      setMessage('❌ Erro ao ativar Premium: ' + error.message);
      alert('❌ Erro ao ativar Premium. Verifique o console para mais detalhes.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ marginTop: 20, textAlign: 'center' }}>
      <div style={{ marginBottom: 10 }}>
        <button
          onClick={testSync}
          disabled={isLoading}
          style={{
            background: isLoading ? "#666" : "#0eb8d0",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            padding: "8px 16px",
            fontWeight: 600,
            fontSize: 14,
            cursor: isLoading ? "not-allowed" : "pointer",
            marginRight: 10,
            opacity: isLoading ? 0.7 : 1
          }}
        >
          {isLoading ? "⏳ Testando..." : "🔄 Testar Sincronização"}
        </button>
        
        <button
          onClick={activatePremium}
          disabled={isLoading}
          style={{
            background: isLoading ? "#666" : "#11b581",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            padding: "8px 16px",
            fontWeight: 600,
            fontSize: 14,
            cursor: isLoading ? "not-allowed" : "pointer",
            opacity: isLoading ? 0.7 : 1
          }}
        >
          {isLoading ? "⏳ Ativando..." : "💎 Ativar Premium"}
        </button>
      </div>
      
      {message && (
        <div style={{
          padding: "8px 16px",
          borderRadius: 6,
          fontSize: 14,
          fontWeight: 600,
          background: message.includes('✅') ? "#11b58120" : "#ff6b3520",
          color: message.includes('✅') ? "#11b581" : "#ff6b35",
          border: `1px solid ${message.includes('✅') ? "#11b58140" : "#ff6b3540"}`,
          marginTop: 10
        }}>
          {message}
        </div>
      )}
    </div>
  );
}
