import React from "react";
import { useNavigate } from "react-router-dom";
import { FiArrowLeft, FiSettings, FiHome, FiList, FiLogOut } from "react-icons/fi";

export default function EmConstrucao() {
  const navigate = useNavigate();

  function handleVoltarMenu() {
    window.location.href = '/home';
  }

  function handleConfiguracao() {
    window.location.href = '/configuracoes';
  }

  function handleVisualizarExamesSalvos() {
    window.location.href = '/exames-realizados';
  }

  function handleLogout() {
    window.location.href = '/';
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(120deg,#101824 0%,#1c2740 100%)",
      color: "#fff",
      fontFamily: "Segoe UI, Inter, Arial, sans-serif",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      padding: "clamp(8px, 2vw, 20px)",
      boxSizing: "border-box",
      position: "relative"
    }}>
      {/* Botão Casa - Canto superior esquerdo */}
      <button
        onClick={handleVoltarMenu}
        style={{
          position: "absolute",
          left: "clamp(8px, 2vw, 12px)",
          top: "clamp(8px, 2vw, 12px)",
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
          zIndex: 10,
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
        title="Menu de Exames"
      >
        <FiHome />
      </button>

      {/* Botões - Canto superior direito */}
      <div style={{ position: "absolute", right: "clamp(8px, 2vw, 12px)", top: "clamp(8px, 2vw, 12px)", display: "flex", gap: "clamp(6px, 1.5vw, 8px)", zIndex: 10 }}>
        <button
          onClick={handleVisualizarExamesSalvos}
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
          onClick={handleConfiguracao}
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
          onClick={handleLogout}
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
          width: "clamp(100px, 15vw, 140px)",
          marginTop: "clamp(8px, 2vw, 16px)",
          marginBottom: "clamp(6px, 1.5vw, 10px)",
          filter: "drop-shadow(0 10px 32px #00e0ff90)",
          animation: "logoGlow 3s ease-in-out infinite alternate"
        }}
      />

      <div style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        flex: 1,
        textAlign: "center"
      }}>
        <h1 style={{ 
          fontSize: "clamp(32px, 6vw, 42px)", 
          fontWeight: 800, 
          marginBottom: "clamp(12px, 2vw, 18px)", 
          color: "#0eb8d0", 
          letterSpacing: 2 
        }}>
          Em Construção 🚧
        </h1>
        <div style={{ 
          fontSize: "clamp(16px, 3vw, 20px)", 
          maxWidth: "clamp(300px, 50vw, 350px)", 
          textAlign: "center", 
          marginBottom: "clamp(20px, 3vw, 30px)",
          lineHeight: 1.5
        }}>
          Esta funcionalidade estará disponível em breve.<br/>Aguarde as próximas atualizações!
        </div>
        <button
          onClick={() => navigate(-1)}
          style={{
            background: "linear-gradient(135deg, #0eb8d0 0%, #0a8ba3 100%)",
            color: "#fff",
            fontWeight: 700,
            border: "none",
            borderRadius: "clamp(6px, 1.5vw, 8px)",
            fontSize: "clamp(16px, 2.5vw, 18px)",
            padding: "clamp(10px, 2vw, 12px) clamp(20px, 3vw, 24px)",
            boxShadow: "0 4px 15px rgba(14, 184, 208, 0.3)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "clamp(6px, 1.5vw, 8px)",
            transition: "all 0.3s ease"
          }}
          onMouseOver={(e) => {
            e.target.style.transform = "translateY(-2px)";
            e.target.style.boxShadow = "0 6px 20px rgba(14, 184, 208, 0.4)";
          }}
          onMouseOut={(e) => {
            e.target.style.transform = "translateY(0)";
            e.target.style.boxShadow = "0 4px 15px rgba(14, 184, 208, 0.3)";
          }}
        >
          <FiArrowLeft size={22}/> Voltar
        </button>
      </div>

      <style>{`
        @keyframes logoGlow {
          0% {
            filter: drop-shadow(0 10px 32px #00e0ff90);
          }
          100% {
            filter: drop-shadow(0 18px 48px #00e0ffc0);
          }
        }
      `}</style>
    </div>
  );
} 