import React from "react";
import { useNavigate } from "react-router-dom";

export default function Landing() {
  console.log("Landing component is rendering");
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
        src="/venoai-logo.png"
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

      <div style={{ marginBottom: 32 }}>
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
            letterSpacing: 1,
            marginRight: 12
          }}
        >
          Entrar / Cadastrar
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