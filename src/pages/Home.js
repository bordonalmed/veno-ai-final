import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FiLogOut, FiSettings, FiList } from "react-icons/fi";
import TrialStatus from "../components/TrialStatus";
import PremiumNotification from "../components/PremiumNotification";
import { TrialManager } from "../utils/trialManager";

export default function Home({ onLogout }) {
  const navigate = useNavigate();
  const userEmail = localStorage.getItem("userEmail");
  const [planoUsuario, setPlanoUsuario] = useState('trial');
  const [carregandoPlano, setCarregandoPlano] = useState(true);
  
  useEffect(() => {
    const verificarPlano = async () => {
      if (!userEmail) {
        setCarregandoPlano(false);
        return;
      }
      
      try {
        // Primeiro tentar verificação local
        const planoLocal = localStorage.getItem(`plano_${userEmail}`);
        if (planoLocal) {
          setPlanoUsuario(planoLocal);
          setCarregandoPlano(false);
          return;
        }
        
        // Se não tem dados locais, verificar no servidor
        const planoVerificado = await TrialManager.verificarPremiumNoServidor(userEmail);
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
      
      <div style={{ margin: "10px 0 15px", fontSize: 14, color: "#abfaff" }}>
        Selecione o tipo de exame para continuar:
      </div>
      
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(2, 1fr)",
        gap: 10,
        width: "100%",
        maxWidth: 600,
        padding: "0 20px"
      }}>
        <MenuButton label="MMII Venoso" onClick={() => navigate("/mmii-venoso")} />
        <MenuButton label="MMII Arterial" onClick={() => navigate("/mmii-arterial")} />
        <MenuButton label="MMSS Venoso" onClick={() => navigate("/mmss-venoso")} />
        <MenuButton label="MMSS Arterial" onClick={() => navigate("/mmss-arterial")} />
        <MenuButton label="Carótidas e Vertebrais" onClick={() => navigate("/carotidas-vertebrais")} />
        {/* <MenuButton label="Aorta e Ilíacas" onClick={() => navigate("/aorta-iliacas")} /> */}
        {/* <MenuButton label="Artérias Renais" onClick={() => navigate("/arterias-renais")} /> */}
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
        `}
      </style>
    </div>
  );
}

function MenuButton({ label, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: "100%",
        background: "#0eb8d0",
        color: "#fff",
        fontWeight: 600,
        fontSize: 14,
        padding: "10px 8px",
        border: "none",
        borderRadius: 10,
        cursor: "pointer",
        letterSpacing: 0.5,
        boxShadow: "0 2px 10px #00e0ff30",
        transition: ".2s",
        minHeight: 45,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        lineHeight: 1.3
      }}
      onMouseEnter={(e) => {
        e.target.style.background = "#0ca8b8";
        e.target.style.transform = "translateY(-2px)";
        e.target.style.boxShadow = "0 4px 15px #00e0ff50";
      }}
      onMouseLeave={(e) => {
        e.target.style.background = "#0eb8d0";
        e.target.style.transform = "translateY(0)";
        e.target.style.boxShadow = "0 2px 10px #00e0ff30";
      }}
    >
      {label}
    </button>
  );
} 