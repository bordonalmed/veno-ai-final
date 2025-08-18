import React from "react";
import { FiSettings, FiHome, FiList, FiLogOut } from "react-icons/fi";

const ExamHeader = ({ 
  examTitle, 
  nome, 
  idade, 
  data, 
  lado, 
  onInputChange, 
  onVisualizar, 
  onSalvar, 
  onVoltarMenu, 
  onConfiguracao, 
  onVisualizarExamesSalvos, 
  onLogout,
  erro 
}) => {
  // Verificar se todos os campos obrigatórios estão preenchidos
  const isFormValid = nome?.trim() && idade && data && lado;

  return (
    <>
      {/* Botão Casa - Canto superior esquerdo */}
      <button
        onClick={onVoltarMenu}
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
          onClick={onVisualizarExamesSalvos}
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
          onClick={onConfiguracao}
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

      {/* Logo */}
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

      {/* Título do Exame */}
      <h1 style={{
        fontSize: "clamp(18px, 3vw, 24px)",
        fontWeight: "600",
        color: "#0eb8d0",
        textAlign: "center",
        margin: "0 0 clamp(12px, 2vw, 16px) 0",
        textShadow: "0 2px 8px #00e0ff40",
        letterSpacing: "0.5px"
      }}>
        {examTitle}
      </h1>

      {/* Primeira linha: campos de entrada */}
      <div style={{
        width: "100%",
        maxWidth: "min(1100px, 95vw)",
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: "clamp(8px, 1.5vw, 12px)",
        margin: "0 auto clamp(12px, 2vw, 16px) auto",
        background: "#18243a",
        borderRadius: "clamp(8px, 1.5vw, 12px)",
        boxShadow: "0 2px 18px #00e0ff18, 0 1.5px 8px #00e0ff10",
        padding: "clamp(8px, 1.5vw, 10px) clamp(12px, 2vw, 16px) clamp(4px, 1vw, 6px) clamp(12px, 2vw, 16px)",
        flexWrap: "wrap"
      }}>
        <input
          type="text"
          name="nome"
          placeholder="Nome do Paciente"
          value={nome}
          onChange={onInputChange}
          required
          style={{ 
            ...inputStyle, 
            width: "clamp(250px, 35vw, 500px)", 
            fontSize: "clamp(12px, 2.5vw, 14px)", 
            height: "clamp(28px, 4vw, 32px)", 
            padding: "clamp(3px, 1vw, 4px) clamp(6px, 1.5vw, 8px)", 
            boxShadow: "0 1.5px 6px #00e0ff08" 
          }}
          autoComplete="off"
        />
        <input
          type="number"
          name="idade"
          placeholder="Idade"
          value={idade}
          onChange={onInputChange}
          min={0}
          max={120}
          required
          style={{ 
            ...inputStyle, 
            width: "clamp(80px, 12vw, 120px)", 
            fontSize: "clamp(12px, 2.5vw, 14px)", 
            height: "clamp(28px, 4vw, 32px)", 
            padding: "clamp(3px, 1vw, 4px) clamp(6px, 1.5vw, 8px)", 
            boxShadow: "0 1.5px 6px #00e0ff08" 
          }}
        />
        <input
          type="date"
          name="data"
          placeholder="Data do Exame"
          value={data}
          onChange={onInputChange}
          required
          style={{ 
            ...inputStyle, 
            width: "clamp(120px, 15vw, 150px)", 
            fontSize: "clamp(12px, 2.5vw, 14px)", 
            height: "clamp(28px, 4vw, 32px)", 
            padding: "clamp(3px, 1vw, 4px) clamp(6px, 1.5vw, 8px)", 
            boxShadow: "0 1.5px 6px #00e0ff08" 
          }}
        />
        <select
          name="lado"
          value={lado}
          onChange={onInputChange}
          style={{ 
            ...inputStyle, 
            width: "clamp(140px, 18vw, 200px)", 
            fontSize: "clamp(12px, 2.5vw, 14px)", 
            height: "clamp(28px, 4vw, 32px)", 
            color: lado ? "#222" : "#888", 
            padding: "clamp(3px, 1vw, 4px) clamp(6px, 1.5vw, 8px)", 
            boxShadow: "0 1.5px 6px #00e0ff08" 
          }}
          required
        >
          <option value="">Selecione o Lado</option>
          <option value="Direito">Direito</option>
          <option value="Esquerdo">Esquerdo</option>
          <option value="Ambos">Ambos</option>
        </select>
      </div>

      {/* Mensagem de erro */}
      {erro && (
        <div style={{ color: "#ff6565", marginTop: 12, fontWeight: 600 }}>
          {erro}
        </div>
      )}

      {/* Segunda linha: botões centralizados */}
      <div style={{
        display: 'flex',
        gap: 'clamp(8px, 2vw, 12px)',
        marginTop: 'clamp(8px, 2vw, 12px)',
        flexWrap: 'wrap',
        justifyContent: 'center'
      }}>
        <button
          style={{ 
            ...buttonStyle, 
            background: isFormValid ? '#0eb8d0' : '#666', 
            color: '#fff', 
            minWidth: 'clamp(140px, 25vw, 160px)', 
            fontSize: 'clamp(12px, 2.5vw, 14px)', 
            padding: "clamp(6px, 2vw, 8px) clamp(12px, 3vw, 16px)",
            cursor: isFormValid ? 'pointer' : 'not-allowed',
            opacity: isFormValid ? 1 : 0.6
          }}
          onClick={onVisualizar}
          disabled={!isFormValid}
          aria-disabled={!isFormValid}
        >
          Visualizar Laudo
        </button>
        <button
          style={{ 
            ...buttonStyle, 
            background: isFormValid ? '#28a745' : '#666', 
            color: '#fff', 
            minWidth: 'clamp(140px, 25vw, 160px)', 
            fontSize: 'clamp(12px, 2.5vw, 14px)', 
            padding: "clamp(6px, 2vw, 8px) clamp(12px, 3vw, 16px)",
            cursor: isFormValid ? 'pointer' : 'not-allowed',
            opacity: isFormValid ? 1 : 0.6
          }}
          onClick={onSalvar}
          disabled={!isFormValid}
          aria-disabled={!isFormValid}
        >
          Salvar Exame
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
    </>
  );
};

const inputStyle = {
  background: "#f7fbff",
  border: "1.5px solid #0eb8d0",
  borderRadius: "clamp(5px, 1vw, 7px)",
  padding: "clamp(6px, 1.5vw, 8px) clamp(8px, 2vw, 12px)",
  fontSize: "clamp(13px, 2.5vw, 15px)",
  color: "#222",
  outline: "none",
  fontFamily: "inherit",
  fontWeight: 500,
  width: "clamp(140px, 25vw, 180px)",
  minWidth: 0
};

const buttonStyle = {
  background: "#0eb8d0",
  color: "#fff",
  fontWeight: 600,
  fontSize: "clamp(14px, 2.5vw, 16px)",
  padding: "clamp(8px, 2vw, 10px) clamp(16px, 3vw, 22px)",
  border: "none",
  borderRadius: "clamp(6px, 1.5vw, 8px)",
  cursor: "pointer",
  letterSpacing: 0.5,
  boxShadow: "0 2px 10px #00e0ff30",
  transition: ".2s",
  marginLeft: "clamp(6px, 1.5vw, 8px)",
  minWidth: "clamp(120px, 20vw, 140px)"
};

export default ExamHeader;
