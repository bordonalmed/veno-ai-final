import React, { useState, useEffect } from 'react';
import { TrialManager } from '../utils/trialManager';

export default function PremiumNotification({ userEmail }) {
  const [mostrarNotificacao, setMostrarNotificacao] = useState(false);
  const [plano, setPlano] = useState('trial');

  useEffect(() => {
    const verificarStatus = async () => {
      if (!userEmail) return;

      try {
        // Verificar plano (agora verifica no Firebase também)
        const planoVerificado = await TrialManager.verificarPlanoUsuario(userEmail);
        const planoLocal = localStorage.getItem(`plano_${userEmail}`);
        
        setPlano(planoVerificado);

        // Se detectou Premium no Firebase mas não tinha localmente, mostrar notificação
        if (planoVerificado === 'premium' && planoLocal !== 'premium') {
          setMostrarNotificacao(true);
          
          // Auto-esconder após 5 segundos
          setTimeout(() => {
            setMostrarNotificacao(false);
          }, 5000);
        }
      } catch (error) {
        console.error('Erro ao verificar status Premium:', error);
      }
    };

    verificarStatus();
  }, [userEmail]);

  if (!mostrarNotificacao || plano !== 'premium') {
    return null;
  }

  return (
    <div style={{
      position: 'fixed',
      top: 20,
      right: 20,
      background: 'linear-gradient(135deg, #ff9500, #ff6b00)',
      color: 'white',
      padding: '15px 20px',
      borderRadius: 10,
      boxShadow: '0 8px 25px rgba(255, 149, 0, 0.3)',
      zIndex: 1000,
      animation: 'slideInRight 0.5s ease-out',
      maxWidth: 300,
      cursor: 'pointer'
    }}
    onClick={() => setMostrarNotificacao(false)}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ fontSize: 24 }}>👑</div>
        <div>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }}>
            Status Premium Detectado!
          </div>
          <div style={{ fontSize: 12, opacity: 0.9 }}>
            Seu plano Premium foi sincronizado automaticamente
          </div>
        </div>
      </div>
      
      <style>{`
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
