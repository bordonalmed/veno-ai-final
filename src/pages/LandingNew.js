import React from "react";
import { useNavigate } from "react-router-dom";

export default function LandingNew() {
  console.log("LandingNew component is rendering - NO VER PLANOS BUTTON");
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
      justifyContent: "center",
      padding: 20
    }}>
      <img
        src={process.env.PUBLIC_URL + "/venoai-logo.png"}
        alt="VENO.AI"
        style={{
          width: 400,
          marginBottom: 10,
          filter: "drop-shadow(0 15px 40px #00e0ff90)",
          animation: "logoGlow 3s ease-in-out infinite alternate"
        }}
      />
      
      <div style={{ 
        textAlign: "center", 
        marginBottom: 40,
        maxWidth: 600
      }}>
        <h2 style={{ 
          fontSize: 28, 
          fontWeight: 700, 
          marginBottom: 20, 
          color: "#0eb8d0",
          lineHeight: 1.3
        }}>
          O padrão inteligente para laudos vasculares
        </h2>
        
        <p style={{ 
          fontSize: 18, 
          lineHeight: 1.6, 
          opacity: 0.9,
          marginBottom: 10
        }}>
          Laudos doppler gerados com precisão, organizados com tecnologia.
        </p>
        
        <p style={{ 
          fontSize: 18, 
          lineHeight: 1.6, 
          opacity: 0.9,
          fontWeight: 600,
          color: "#aaffee"
        }}>
          Profissionalize sua rotina com VENO.AI.
        </p>
      </div>

      {/* Botões de ação */}
      <div style={{ marginBottom: 32, display: "flex", gap: 12 }}>
        <button
          onClick={() => navigate("/login")}
          style={{
            background: "#0eb8d0",
            color: "#fff",
            border: "none",
            borderRadius: 10,
            fontWeight: 600,
            fontSize: 19,
            padding: "14px 38px",
            cursor: "pointer",
            boxShadow: "0 2px 12px #00e0ff45",
            letterSpacing: 1
          }}
        >
          Entrar / Cadastrar
        </button>
        
        <button
          onClick={() => navigate("/planos")}
          style={{
            background: "transparent",
            color: "#0eb8d0",
            border: "2px solid #0eb8d0",
            borderRadius: 10,
            fontWeight: 600,
            fontSize: 19,
            padding: "14px 38px",
            cursor: "pointer",
            letterSpacing: 1,
            transition: "all 0.3s ease"
          }}
          onMouseEnter={(e) => {
            e.target.style.background = "#0eb8d0";
            e.target.style.color = "#fff";
            e.target.style.transform = "translateY(-2px)";
            e.target.style.boxShadow = "0 4px 15px #00e0ff50";
          }}
          onMouseLeave={(e) => {
            e.target.style.background = "transparent";
            e.target.style.color = "#0eb8d0";
            e.target.style.transform = "translateY(0)";
            e.target.style.boxShadow = "none";
          }}
        >
          Ver Planos
        </button>
      </div>
      
      <footer style={{ marginTop: 30, fontSize: 14, color: "#aae", opacity: 0.7 }}>
        &copy; {new Date().getFullYear()} VENO.AI — Powered by Equipe VENO.AI
      </footer>
      
      <style>
        {`
          @keyframes logoGlow {
            0% {
              filter: drop-shadow(0 15px 40px #00e0ff90);
            }
            100% {
              filter: drop-shadow(0 25px 55px #00e0ffc0);
            }
          }
        `}
      </style>
    </div>
  );
}
