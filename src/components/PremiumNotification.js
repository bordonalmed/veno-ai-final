import React, { useState, useEffect } from 'react';
import { FaCrown } from 'react-icons/fa';
import { EVENTO_PLANO_ATUALIZADO } from '../services/planoService';

export default function PremiumNotification({ userEmail }) {
  const [mostrarNotificacao, setMostrarNotificacao] = useState(false);

  // aparece quando a conta acabou de trazer o Premium para este navegador
  useEffect(() => {
    let timer;
    const f = (e) => {
      if (e.detail?.ativouAgora && (!userEmail || e.detail.email === userEmail)) {
        setMostrarNotificacao(true);
        clearTimeout(timer);
        timer = setTimeout(() => setMostrarNotificacao(false), 5000);
      }
    };
    window.addEventListener(EVENTO_PLANO_ATUALIZADO, f);
    return () => { window.removeEventListener(EVENTO_PLANO_ATUALIZADO, f); clearTimeout(timer); };
  }, [userEmail]);

  if (!mostrarNotificacao) {
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
        <div style={{ fontSize: 24, display: 'flex' }}><FaCrown /></div>
        <div>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }}>
            Premium ativo!
          </div>
          <div style={{ fontSize: 12, opacity: 0.9 }}>
            Seu plano Premium foi confirmado na sua conta
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
