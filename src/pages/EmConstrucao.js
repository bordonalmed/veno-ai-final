import React from "react";
import { useNavigate } from "react-router-dom";
import { FiArrowLeft } from "react-icons/fi";

export default function EmConstrucao() {
  const navigate = useNavigate();
  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(120deg,#101824 0%,#1c2740 100%)",
      color: "#fff",
      fontFamily: "Segoe UI, Inter, Arial, sans-serif",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center"
    }}>
      <h1 style={{ fontSize: 42, fontWeight: 800, marginBottom: 18, color: "#0eb8d0", letterSpacing: 2 }}>
        Em Construção 🚧
      </h1>
      <div style={{ fontSize: 20, maxWidth: 350, textAlign: "center", marginBottom: 30 }}>
        Esta funcionalidade estará disponível em breve.<br/>Aguarde as próximas atualizações!
      </div>
      <button
        onClick={() => navigate(-1)}
        style={{
          background: "#232f4e",
          color: "#0eb8d0",
          fontWeight: 700,
          border: "2px solid #0eb8d0",
          borderRadius: 8,
          fontSize: 18,
          padding: "10px 24px",
          boxShadow: "0 2px 8px #00e0ff20",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 8
        }}
      >
        <FiArrowLeft size={22}/> Voltar
      </button>
    </div>
  );
} 