import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FiLogOut, FiSettings, FiList } from "react-icons/fi";
import TrialStatus from "../components/TrialStatus";
import PremiumNotification from "../components/PremiumNotification";
import { TrialManager } from "../utils/trialManager";

const COLOR_STYLES = {
  blue: { border: "#3f93e0", ring: "rgba(63,147,224,0.1)", glow: "rgba(63,147,224,0.55)" },
  red: { border: "#e0574a", ring: "rgba(224,87,74,0.1)", glow: "rgba(224,87,74,0.55)" },
  cyan: { border: "#4fd8ec", ring: "rgba(14,184,208,0.1)", glow: "rgba(14,184,208,0.55)" },
};

const EXAMES = [
  { label: "Doppler Venoso de Membros Inferiores", rota: "/mmii-venoso", emoji: "🦵", cor: "blue", regiao: "Membros inferiores" },
  { label: "Doppler Arterial de Membros Inferiores", rota: "/mmii-arterial", emoji: "🦵", cor: "red", regiao: "Membros inferiores" },
  { label: "Doppler Venoso de Membros Superiores", rota: "/mmss-venoso", emoji: "💪", cor: "blue", regiao: "Membros superiores" },
  { label: "Doppler Arterial de Membros Superiores", rota: "/mmss-arterial", emoji: "💪", cor: "red", regiao: "Membros superiores" },
  { label: "Doppler de Carótidas e Vertebrais", rota: "/carotidas-vertebrais", emoji: "🧠", cor: "cyan", regiao: "Pescoço" },
];

export default function Home({ onLogout }) {
  const navigate = useNavigate();
  const userEmail = localStorage.getItem("userEmail");
  const nomeMedico = localStorage.getItem("nomeMedico") || "";
  const [planoUsuario, setPlanoUsuario] = useState('trial');
  const [carregandoPlano, setCarregandoPlano] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  // Hook para detectar mudanças no tamanho da tela
  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);

    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);

  useEffect(() => {
    const verificarPlano = async () => {
      if (!userEmail) {
        setCarregandoPlano(false);
        return;
      }
      
      try {
        // Verificar plano (agora verifica no Firebase também)
        const planoVerificado = await TrialManager.verificarPlanoUsuario(userEmail);
        setPlanoUsuario(planoVerificado);
      } catch (error) {
        console.error('Erro ao verificar plano:', error);
        setPlanoUsuario('trial');
      } finally {
        setCarregandoPlano(false);
      }
    };
    
    verificarPlano();
  }, [userEmail]);
  
  const handleUpgrade = () => {
    navigate("/planos");
  };
  
  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(120deg,#101824 0%,#1c2740 100%)",
      color: "#fff",
      fontFamily: "Segoe UI, Inter, Arial, sans-serif",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      paddingTop: 15,
      paddingBottom: 15,
    }}>
      {/* Notificação de Status Premium */}
      <PremiumNotification userEmail={userEmail} />
      {/* Botões - Canto superior direito */}
      <div style={{ position: "absolute", right: 25, top: 25, display: "flex", gap: 12 }}>
        <button
          onClick={() => navigate("/exames-realizados")}
          style={{
            background: "rgba(18, 30, 56, 0.7)",
            border: "1px solid rgba(111, 66, 193, 0.3)",
            borderRadius: "clamp(4px, 1vw, 6px)",
            padding: "clamp(4px, 1vw, 6px)",
            color: "#6f42c1",
            fontSize: "clamp(14px, 2.5vw, 18px)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: 0.8,
            transition: "all 0.2s ease"
          }}
          onMouseEnter={(e) => {
            e.target.style.opacity = "1";
            e.target.style.background = "rgba(18, 30, 56, 0.9)";
          }}
          onMouseLeave={(e) => {
            e.target.style.opacity = "0.8";
            e.target.style.background = "rgba(18, 30, 56, 0.7)";
          }}
          title="Visualizar Exames Salvos"
        >
          <FiList />
        </button>
        <button
          onClick={() => navigate("/configuracoes")}
          style={{
            background: "rgba(18, 30, 56, 0.7)",
            border: "1px solid rgba(14, 184, 208, 0.3)",
            borderRadius: "clamp(4px, 1vw, 6px)",
            padding: "clamp(4px, 1vw, 6px)",
            color: "#0eb8d0",
            fontSize: "clamp(14px, 2.5vw, 18px)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: 0.8,
            transition: "all 0.2s ease"
          }}
          onMouseEnter={(e) => {
            e.target.style.opacity = "1";
            e.target.style.background = "rgba(18, 30, 56, 0.9)";
          }}
          onMouseLeave={(e) => {
            e.target.style.opacity = "0.8";
            e.target.style.background = "rgba(18, 30, 56, 0.7)";
          }}
          title="Configurações"
        >
          <FiSettings />
        </button>
        <button
          onClick={onLogout}
          style={{
            background: "rgba(18, 30, 56, 0.7)",
            border: "1px solid rgba(255, 124, 124, 0.3)",
            borderRadius: "clamp(4px, 1vw, 6px)",
            padding: "clamp(4px, 1vw, 6px)",
            color: "#ff7c7c",
            fontSize: "clamp(14px, 2.5vw, 18px)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: 0.8,
            transition: "all 0.2s ease"
          }}
          onMouseEnter={(e) => {
            e.target.style.opacity = "1";
            e.target.style.background = "rgba(18, 30, 56, 0.9)";
          }}
          onMouseLeave={(e) => {
            e.target.style.opacity = "0.8";
            e.target.style.background = "rgba(18, 30, 56, 0.7)";
          }}
          title="Sair"
        >
          <FiLogOut />
        </button>
      </div>
      
      <img 
        src={process.env.PUBLIC_URL + "/venoai-logo.png"} 
        alt="VENO.AI" 
        style={{ 
          width: 120, 
          marginBottom: 10, 
          filter: "drop-shadow(0 6px 20px #00e0ff90)",
          animation: "logoGlow 3s ease-in-out infinite alternate"
        }}
      />

      <span style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 14, fontFamily: "monospace", fontSize: 11, color: "#5fce8a", letterSpacing: 0.4 }}>
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#5fce8a", boxShadow: "0 0 6px #5fce8a" }}></span>
        SISTEMA ONLINE
      </span>

      {/* Status do Trial */}
      <TrialStatus userEmail={userEmail} onUpgrade={handleUpgrade} />
      
      {/* Botão de Upgrade Promocional */}
      {userEmail && !carregandoPlano && planoUsuario === "trial" && (
        <div style={{
          background: "rgba(255, 149, 0, 0.1)",
          border: "1px solid rgba(255, 149, 0, 0.3)",
          color: "#ff9500",
          padding: "10px 16px",
          borderRadius: 8,
          margin: "10px 20px",
          textAlign: "center",
          fontSize: 14
        }}>
          <span style={{ fontWeight: 600 }}>🚀 Upgrade para Premium</span>
          <span style={{ opacity: 0.8, marginLeft: 8 }}>• Laudos ilimitados</span>
          <button
            onClick={handleUpgrade}
            style={{
              background: "transparent",
              color: "#ff9500",
              border: "1px solid #ff9500",
              borderRadius: 6,
              padding: "6px 12px",
              fontWeight: 600,
              fontSize: 12,
              cursor: "pointer",
              marginLeft: 8,
              transition: "all 0.3s ease"
            }}
            onMouseEnter={(e) => {
              e.target.style.background = "#ff9500";
              e.target.style.color = "#fff";
            }}
            onMouseLeave={(e) => {
              e.target.style.background = "transparent";
              e.target.style.color = "#ff9500";
            }}
          >
            R$ 97/mês
          </button>
        </div>
      )}
      
      {nomeMedico && (
        <div style={{ width: "100%", maxWidth: 820, padding: "0 20px", marginTop: 8, boxSizing: "border-box" }}>
          <div style={{ fontSize: 20, fontWeight: 600, color: "#ffffff" }}>Olá, {nomeMedico}</div>
          <div style={{ marginTop: 5, height: 2, width: 56, background: "linear-gradient(90deg, #4fd8ec, transparent)" }}></div>
        </div>
      )}

      <div style={{ margin: "10px 0 15px", fontSize: 14, color: "#abfaff" }}>
        Selecione o tipo de exame para continuar:
      </div>

      <div style={{
        display: "grid",
        gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)",
        gap: isMobile ? 10 : 16,
        width: "100%",
        maxWidth: isMobile ? 420 : 820,
        padding: "0 20px"
      }}>
        {EXAMES.map((exame) => (
          <ExamTile key={exame.label} exame={exame} isMobile={isMobile} onClick={() => navigate(exame.rota)} />
        ))}
      </div>
      

      
      <style>
        {`
          @keyframes logoGlow {
            0% {
              filter: drop-shadow(0 8px 25px #00e0ff90);
            }
            100% {
              filter: drop-shadow(0 12px 35px #00e0ffc0);
            }
          }
          .examTile {
            position: relative;
            display: flex;
            gap: 12px;
            border: 1px solid rgba(79,216,236,0.25);
            background: linear-gradient(160deg, rgba(255,255,255,0.05), rgba(255,255,255,0.015));
            clip-path: polygon(14px 0, 100% 0, 100% calc(100% - 14px), calc(100% - 14px) 100%, 0 100%, 0 14px);
            cursor: pointer;
            transition: transform .18s ease, border-color .18s ease, box-shadow .18s ease, background .18s ease;
          }
          .examTile:hover {
            border-color: rgba(79,216,236,0.75);
            box-shadow: 0 0 24px var(--glow);
            background: linear-gradient(160deg, rgba(79,216,236,0.09), rgba(255,255,255,0.02));
            transform: translateY(-3px);
          }
          .examTile::before, .examTile::after {
            content: "";
            position: absolute;
            width: 14px;
            height: 14px;
            pointer-events: none;
          }
          .examTile::before { top: -1px; right: -1px; border-top: 2px solid #4fd8ec; border-right: 2px solid #4fd8ec; }
          .examTile::after { bottom: -1px; left: -1px; border-bottom: 2px solid #4fd8ec; border-left: 2px solid #4fd8ec; }
          .examTile:focus-visible { outline: 2px solid #4fd8ec; outline-offset: 3px; }
        `}
      </style>
    </div>
  );
}

function ExamTile({ exame, isMobile, onClick }) {
  const c = COLOR_STYLES[exame.cor];
  return (
    <button
      className="examTile"
      onClick={onClick}
      aria-label={exame.label}
      style={{
        "--glow": c.glow,
        flexDirection: isMobile ? "row" : "column",
        alignItems: "center",
        justifyContent: isMobile ? "flex-start" : "center",
        padding: isMobile ? "12px 16px" : "24px 14px 18px",
      }}
    >
      <div style={{
        width: isMobile ? 44 : 56,
        height: isMobile ? 44 : 56,
        borderRadius: "50%",
        border: `1.5px solid ${c.border}`,
        background: c.ring,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}>
        <span style={{ fontSize: isMobile ? 20 : 24, filter: "grayscale(1) contrast(1.15)" }}>{exame.emoji}</span>
      </div>
      <span style={{
        fontWeight: 600,
        fontSize: isMobile ? 13 : 14,
        color: "#ffffff",
        textAlign: isMobile ? "left" : "center",
        lineHeight: 1.3,
      }}>
        {exame.label}
      </span>
    </button>
  );
}