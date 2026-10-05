import React from "react";
import { useNavigate } from "react-router-dom";
import { GiBiceps, GiBrain, GiLeg } from "react-icons/gi";
import { FiTarget } from "react-icons/fi";

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
      padding: "20px 15px"
    }}>
      <img
        src={process.env.PUBLIC_URL + "/venoai-logo.png"}
        alt="VENO.AI"
        style={{
          width: "min(300px, 80vw)",
          maxWidth: 400,
          marginBottom: 10,
          filter: "drop-shadow(0 15px 40px #00e0ff90)",
          animation: "logoGlow 3s ease-in-out infinite alternate"
        }}
      />
      
      <div style={{ 
        textAlign: "center", 
        marginBottom: 30,
        maxWidth: "90vw",
        width: "100%"
      }}>
        <h2 style={{ 
          fontSize: "clamp(20px, 5vw, 28px)", 
          fontWeight: 700, 
          marginBottom: 15, 
          color: "#0eb8d0",
          lineHeight: 1.3,
          padding: "0 10px"
        }}>
          O padrão inteligente para laudos vasculares
        </h2>
        
        <p style={{ 
          fontSize: "clamp(14px, 4vw, 18px)", 
          lineHeight: 1.6, 
          opacity: 0.9,
          marginBottom: 8,
          padding: "0 10px"
        }}>
          Laudos doppler gerados com precisão, organizados com tecnologia.
        </p>
        
        <p style={{ 
          fontSize: "clamp(14px, 4vw, 18px)", 
          lineHeight: 1.6, 
          opacity: 0.9,
          fontWeight: 600,
          color: "#aaffee",
          padding: "0 10px"
        }}>
          Profissionalize sua rotina com VENO.AI.
        </p>
      </div>

      {/* Selos com os tipos de exame cobertos */}
      <div style={{ display: "flex", gap: 14, marginBottom: 22 }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
          <div style={{ width: 42, height: 42, borderRadius: "50%", border: "1.5px solid #3f93e0", background: "rgba(63,147,224,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <GiLeg size={22} color="#ffffff" style={{ filter: "grayscale(1) contrast(1.15)" }} />
          </div>
          <span style={{ fontSize: 10, color: "#8fb3bd" }}>Venoso</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
          <div style={{ width: 42, height: 42, borderRadius: "50%", border: "1.5px solid #e0574a", background: "rgba(224,87,74,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <GiBiceps size={22} color="#ffffff" style={{ filter: "grayscale(1) contrast(1.15)" }} />
          </div>
          <span style={{ fontSize: 10, color: "#8fb3bd" }}>Arterial</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
          <div style={{ width: 42, height: 42, borderRadius: "50%", border: "1.5px solid #4fd8ec", background: "rgba(14,184,208,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <GiBrain size={22} color="#ffffff" style={{ filter: "grayscale(1) contrast(1.15)" }} />
          </div>
          <span style={{ fontSize: 10, color: "#8fb3bd" }}>Carótidas</span>
        </div>
      </div>

      {/* Chamada do teste gratis */}
      <div style={{
        width: "100%",
        maxWidth: 400,
        boxSizing: "border-box",
        marginBottom: 22,
        background: "rgba(95,206,138,0.08)",
        border: "1px solid rgba(95,206,138,0.3)",
        borderRadius: 10,
        padding: "12px 16px",
        textAlign: "center"
      }}>
        <div style={{ fontSize: 13.5, fontWeight: 600, color: "#5fce8a", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}><FiTarget size={13} /> Teste grátis por 7 dias</div>
        <div style={{ marginTop: 3, fontSize: 12, color: "#9fc7b3" }}>5 laudos inclusos · sem cartão de crédito</div>
      </div>

      {/* Botões de ação */}
      <div style={{ 
        marginBottom: 25, 
        display: "flex", 
        flexDirection: "column",
        gap: 12,
        width: "100%",
        maxWidth: 400,
        padding: "0 15px"
      }}>
        <button
          onClick={() => navigate("/login")}
          style={{
            background: "#0eb8d0",
            color: "#fff",
            border: "none",
            borderRadius: 10,
            fontWeight: 600,
            fontSize: "clamp(16px, 4vw, 19px)",
            padding: "12px 20px",
            cursor: "pointer",
            boxShadow: "0 2px 12px #00e0ff45",
            letterSpacing: 0.5,
            width: "100%",
            whiteSpace: "nowrap"
          }}
        >
          Entrar / Cadastrar
        </button>

        <div style={{ textAlign: "center", fontSize: 11, color: "#6f8890", marginTop: -4 }}>
          Cancele quando quiser · sem compromisso
        </div>

        <button
          onClick={() => navigate("/planos")}
          style={{
            background: "transparent",
            color: "#0eb8d0",
            border: "2px solid #0eb8d0",
            borderRadius: 10,
            fontWeight: 600,
            fontSize: "clamp(16px, 4vw, 19px)",
            padding: "12px 20px",
            cursor: "pointer",
            letterSpacing: 0.5,
            transition: "all 0.3s ease",
            width: "100%",
            whiteSpace: "normal",
            lineHeight: 1.3
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "#0eb8d0";
            e.currentTarget.style.color = "#fff";
            e.currentTarget.style.transform = "translateY(-2px)";
            e.currentTarget.style.boxShadow = "0 4px 15px #00e0ff50";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = "#0eb8d0";
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "none";
          }}
        >
          Ver Planos <span style={{ opacity: 0.75, fontWeight: 500, fontSize: "0.75em" }}>— a partir de R$ 97/mês</span>
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
