import React, { useState, useEffect } from 'react';
import { TrialManager } from '../utils/trialManager';

export default function TrialStatus({ userEmail, onUpgrade }) {
  const [plano, setPlano] = useState('trial');
  const [carregando, setCarregando] = useState(true);
  
  useEffect(() => {
    const verificarPlano = async () => {
      if (!userEmail) {
        setCarregando(false);
        return;
      }
      
      try {
        // Primeiro tentar verificação local
        const planoLocal = localStorage.getItem(`plano_${userEmail}`);
        if (planoLocal) {
          setPlano(planoLocal);
          setCarregando(false);
          return;
        }
        
        // Se não tem dados locais, verificar no servidor
        const planoVerificado = await TrialManager.verificarPremiumNoServidor(userEmail);
        setPlano(planoVerificado);
      } catch (error) {
        console.error('Erro ao verificar plano:', error);
        setPlano('trial');
      } finally {
        setCarregando(false);
      }
    };
    
    verificarPlano();
  }, [userEmail]);
  
  const trial = TrialManager.obterStatusTrial(userEmail);

  // Mostrar carregamento enquanto verifica plano
  if (carregando) {
    return (
      <div style={{
        background: "rgba(14, 184, 208, 0.1)",
        border: "1px solid rgba(14, 184, 208, 0.3)",
        color: "#0eb8d0",
        padding: "8px 16px",
        borderRadius: 8,
        margin: "8px 20px",
        textAlign: "center",
        fontSize: 14
      }}>
        <span style={{ fontWeight: 600 }}>🔄 Verificando status...</span>
      </div>
    );
  }

  // Se for Premium, mostrar status premium
  if (plano === 'premium') {
    return (
      <div style={{
        background: "rgba(255, 149, 0, 0.1)",
        border: "1px solid rgba(255, 149, 0, 0.3)",
        color: "#ff9500",
        padding: "8px 16px",
        borderRadius: 8,
        margin: "8px 20px",
        textAlign: "center",
        fontSize: 14
      }}>
        <span style={{ fontWeight: 600 }}>👑 Plano Premium Ativo</span>
        <span style={{ opacity: 0.8, marginLeft: 8 }}>• Laudos ilimitados</span>
      </div>
    );
  }

  // Se trial não foi iniciado, mostrar botão para iniciar
  if (trial.status === 'nao_iniciado') {
    return (
      <div style={{
        background: "rgba(17, 181, 129, 0.1)",
        border: "1px solid rgba(17, 181, 129, 0.3)",
        color: "#11b581",
        padding: "8px 16px",
        borderRadius: 8,
        margin: "8px 20px",
        textAlign: "center",
        fontSize: 14
      }}>
        <span style={{ fontWeight: 600 }}>🎯 Teste Gratuito Disponível</span>
        <span style={{ opacity: 0.8, marginLeft: 8 }}>• 7 dias + 5 laudos</span>
      </div>
    );
  }

  // Se trial está ativo, mostrar status
  if (trial.status === 'ativo') {
    return (
      <div style={{
        background: "rgba(14, 184, 208, 0.1)",
        border: "1px solid rgba(14, 184, 208, 0.3)",
        color: "#0eb8d0",
        padding: "8px 16px",
        borderRadius: 8,
        margin: "8px 20px",
        textAlign: "center",
        fontSize: 14
      }}>
        <span style={{ fontWeight: 600 }}>⏰ Trial Ativo</span>
        <span style={{ opacity: 0.8, marginLeft: 8 }}>
          • {trial.diasRestantes} dias • {trial.laudosRestantes} laudos
        </span>
      </div>
    );
  }

  // Se trial expirou, mostrar upgrade
  if (trial.status === 'expirado') {
    return (
      <div style={{
        background: "linear-gradient(135deg, #ff6b35, #e55a2b)",
        color: "#fff",
        padding: "12px 20px",
        borderRadius: 10,
        margin: "10px 20px",
        textAlign: "center",
        boxShadow: "0 4px 15px rgba(255, 107, 53, 0.3)"
      }}>
        <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>
          ⚠️ Trial Expirado
        </div>
        <div style={{ fontSize: 14, opacity: 0.9, marginBottom: 8 }}>
          {trial.motivo === 'tempo' ? 'Seus 7 dias acabaram!' : 'Você usou todos os 5 laudos!'}
        </div>
        <button
          onClick={onUpgrade}
          style={{
            background: "#fff",
            color: "#ff6b35",
            border: "none",
            borderRadius: 6,
            padding: "8px 16px",
            fontWeight: 600,
            fontSize: 14,
            cursor: "pointer",
            transition: "all 0.3s ease"
          }}
          onMouseEnter={(e) => {
            e.target.style.transform = "translateY(-2px)";
            e.target.style.boxShadow = "0 4px 12px rgba(255,255,255,0.3)";
          }}
          onMouseLeave={(e) => {
            e.target.style.transform = "translateY(0)";
            e.target.style.boxShadow = "none";
          }}
        >
          Upgrade para Premium
        </button>
      </div>
    );
  }

  // Se trial está ativo, mostrar opção de upgrade
  if (trial.status === 'ativo') {
    return (
      <div style={{
        background: "linear-gradient(135deg, #0eb8d0, #0ca8b8)",
        color: "#fff",
        padding: "12px 20px",
        borderRadius: 10,
        margin: "10px 20px",
        textAlign: "center",
        boxShadow: "0 4px 15px rgba(14, 184, 208, 0.3)"
      }}>
        <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>
          ⏰ Trial Ativo
        </div>
        <div style={{ fontSize: 14, opacity: 0.9, marginBottom: 8 }}>
          {trial.diasRestantes} dias restantes • {trial.laudosRestantes} laudos restantes
        </div>
        <button
          onClick={onUpgrade}
          style={{
            background: "#fff",
            color: "#0eb8d0",
            border: "none",
            borderRadius: 6,
            padding: "8px 16px",
            fontWeight: 600,
            fontSize: 14,
            cursor: "pointer",
            transition: "all 0.3s ease"
          }}
          onMouseEnter={(e) => {
            e.target.style.transform = "translateY(-2px)";
            e.target.style.boxShadow = "0 4px 12px rgba(255,255,255,0.3)";
          }}
          onMouseLeave={(e) => {
            e.target.style.transform = "translateY(0)";
            e.target.style.boxShadow = "none";
          }}
        >
          Upgrade para Premium
        </button>
      </div>
    );
  }

  return null;
}
