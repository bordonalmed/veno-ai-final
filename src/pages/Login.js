import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiEye, FiEyeOff, FiLoader, FiMail, FiLock, FiKey, FiTarget, FiUserPlus } from "react-icons/fi";
import { AuthService } from "../services/supabaseAuthService";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function corForcaSenha(score) {
  if (score <= 1) return "#e74c3c";
  if (score <= 3) return "#f39c12";
  return "#11b581";
}

function textoForcaSenha(score) {
  if (score <= 1) return "Fraca";
  if (score <= 3) return "Média";
  return "Forte";
}

export default function Login({ onLogin, onCadastrar }) {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [erro, setErro] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [modo, setModo] = useState("login"); // "login", "cadastro" ou "recuperar"
  const navigate = useNavigate();

  const [emailRecuperacao, setEmailRecuperacao] = useState("");
  const [mensagemRecuperacao, setMensagemRecuperacao] = useState("");
  const [enviandoRecuperacao, setEnviandoRecuperacao] = useState(false);

  const forcaSenha = modo === "cadastro" && senha ? AuthService.validatePasswordStrength(senha) : null;

  function trocarModo(novoModo) {
    setModo(novoModo);
    setErro("");
    setSenha("");
    setConfirmarSenha("");
  }

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (carregando) return;

    setErro("");

    // Validações básicas
    if (!email || !senha) {
      setErro("Por favor, preencha todos os campos.");
      return;
    }

    if (!EMAIL_REGEX.test(email.trim())) {
      setErro("Por favor, insira um email válido.");
      return;
    }

    if (senha.length < 6) {
      setErro("A senha deve ter pelo menos 6 caracteres.");
      return;
    }

    if (modo === "cadastro" && senha !== confirmarSenha) {
      setErro("As senhas não coincidem.");
      return;
    }

    setCarregando(true);

    try {
      if (modo === "cadastro") {
        await onCadastrar(email, senha);
      } else {
        await onLogin(email, senha);
      }
    } catch (error) {
      console.error("Erro:", error);
      setErro(error.message || "Ocorreu um erro. Tente novamente.");
    } finally {
      setCarregando(false);
    }
  };

  const handleRecuperarSenha = async (e) => {
    e.preventDefault();
    if (enviandoRecuperacao) return;

    setMensagemRecuperacao("");
    if (!EMAIL_REGEX.test(emailRecuperacao.trim())) {
      setMensagemRecuperacao("Por favor, insira um email válido.");
      return;
    }

    setEnviandoRecuperacao(true);
    await AuthService.resetPassword(emailRecuperacao.trim());
    setEnviandoRecuperacao(false);
    setMensagemRecuperacao("Se esse email estiver cadastrado, você vai receber um link para redefinir sua senha.");
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
      justifyContent: "center",
      padding: "20px"
    }}>
      {/* Logo */}
      <img
        src={process.env.PUBLIC_URL + "/venoai-logo.png"}
        alt="VENO.AI"
        style={{
          width: "min(250px, 70vw)",
          maxWidth: 300,
          marginBottom: 30,
          filter: "drop-shadow(0 15px 40px #00e0ff90)",
          animation: "logoGlow 3s ease-in-out infinite alternate"
        }}
      />

      {/* Card de Login */}
      <div style={{
        background: "rgba(18, 30, 56, 0.9)",
        border: "1px solid rgba(14, 184, 208, 0.2)",
        borderRadius: "16px",
        padding: "35px",
        width: "100%",
        maxWidth: "420px",
        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4)"
      }}>
        {/* Título */}
        <div style={{ textAlign: "center", marginBottom: "25px" }}>
          <h2 style={{
            fontSize: "clamp(20px, 4vw, 24px)",
            fontWeight: 700,
            color: "#0eb8d0",
            margin: "0 0 8px 0"
          }}>
            Acesso ao Sistema
          </h2>
          <p style={{
            fontSize: "14px",
            color: "#aaffee",
            margin: "0",
            opacity: 0.9
          }}>
            Sistema de Laudos Doppler Vascular
          </p>
        </div>

        {/* Mensagem de Boas-Vindas */}
        <div style={{
          textAlign: "center",
          marginBottom: "25px",
          padding: "12px",
          background: modo === "cadastro"
            ? "rgba(14, 184, 208, 0.15)"
            : "rgba(111, 66, 193, 0.15)",
          border: modo === "cadastro"
            ? "1px solid rgba(14, 184, 208, 0.3)"
            : "1px solid rgba(111, 66, 193, 0.3)",
          borderRadius: "8px"
        }}>
          <p style={{
            margin: "0",
            fontSize: "13px",
            color: modo === "cadastro" ? "#0eb8d0" : "#aaffee",
            fontWeight: 500,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6
          }}>
            {modo === "cadastro"
              ? <><FiUserPlus /> Bem-vindo! Crie sua conta para começar</>
              : modo === "recuperar"
              ? <><FiKey /> Vamos te ajudar a recuperar o acesso</>
              : <><FiLock /> Faça login para acessar o sistema</>}
          </p>
        </div>

        {modo === "cadastro" && (
          <div style={{
            textAlign: "center",
            marginBottom: "20px",
            padding: "10px 12px",
            background: "rgba(95,206,138,0.1)",
            border: "1px solid rgba(95,206,138,0.3)",
            borderRadius: "8px"
          }}>
            <p style={{ margin: 0, fontSize: "12.5px", color: "#5fce8a", fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
              <FiTarget /> 7 dias grátis, sem cartão de crédito
            </p>
          </div>
        )}

        {modo === "recuperar" ? (
          <form onSubmit={handleRecuperarSenha}>
            <div style={{ marginBottom: "18px" }}>
              <label style={{
                display: "block",
                fontSize: "14px",
                fontWeight: "600",
                color: "#0eb8d0",
                marginBottom: "8px"
              }}>
                Email
              </label>
              <div style={{ position: "relative" }}>
                <FiMail style={{
                  position: "absolute",
                  left: "12px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "#6f42c1",
                  fontSize: "18px",
                  zIndex: 1
                }} />
                <input
                  type="email"
                  value={emailRecuperacao}
                  onChange={(e) => setEmailRecuperacao(e.target.value)}
                  placeholder="seu@email.com"
                  disabled={enviandoRecuperacao}
                  style={{
                    width: "100%",
                    padding: "12px 12px 12px 40px",
                    border: "2px solid rgba(14, 184, 208, 0.3)",
                    borderRadius: "8px",
                    fontSize: "16px",
                    background: "rgba(16, 24, 36, 0.6)",
                    color: "#fff",
                    outline: "none",
                    boxSizing: "border-box"
                  }}
                />
              </div>
            </div>

            {mensagemRecuperacao && (
              <div style={{
                padding: "12px",
                background: mensagemRecuperacao.startsWith("Se esse email")
                  ? "rgba(17, 181, 129, 0.15)"
                  : "rgba(244, 67, 54, 0.15)",
                border: mensagemRecuperacao.startsWith("Se esse email")
                  ? "1px solid rgba(17, 181, 129, 0.5)"
                  : "1px solid rgba(244, 67, 54, 0.5)",
                borderRadius: "8px",
                marginBottom: "20px",
                color: mensagemRecuperacao.startsWith("Se esse email") ? "#5fce8a" : "#ff6b6b",
                fontSize: "14px",
                textAlign: "center"
              }}>
                {mensagemRecuperacao}
              </div>
            )}

            <button
              type="submit"
              disabled={enviandoRecuperacao}
              style={{
                width: "100%",
                padding: "14px",
                background: enviandoRecuperacao ? "rgba(14, 184, 208, 0.3)" : "#0eb8d0",
                color: "#fff",
                border: "none",
                borderRadius: "10px",
                fontSize: "16px",
                fontWeight: "600",
                cursor: enviandoRecuperacao ? "not-allowed" : "pointer",
                marginBottom: "15px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px"
              }}
            >
              {enviandoRecuperacao && <FiLoader className="spin" size={18} />}
              {enviandoRecuperacao ? "Enviando..." : "Enviar link de recuperação"}
            </button>

            <div style={{ textAlign: "center" }}>
              <button
                type="button"
                onClick={() => { trocarModo("login"); setMensagemRecuperacao(""); setEmailRecuperacao(""); }}
                style={{
                  background: "none",
                  border: "none",
                  color: "#0eb8d0",
                  cursor: "pointer",
                  fontSize: "14px",
                  fontWeight: "600",
                  textDecoration: "underline",
                  padding: "4px 8px"
                }}
              >
                Voltar para login
              </button>
            </div>
          </form>
        ) : (
        <form onSubmit={handleSubmit}>
          {/* Campo Email */}
          <div style={{ marginBottom: "18px" }}>
            <label style={{
              display: "block",
              fontSize: "14px",
              fontWeight: "600",
              color: "#0eb8d0",
              marginBottom: "8px"
            }}>
              Email
            </label>
            <div style={{ position: "relative" }}>
              <FiMail style={{
                position: "absolute",
                left: "12px",
                top: "50%",
                transform: "translateY(-50%)",
                color: "#6f42c1",
                fontSize: "18px",
                zIndex: 1
              }} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                disabled={carregando}
                style={{
                  width: "100%",
                  padding: "12px 12px 12px 40px",
                  border: erro && !email 
                    ? "2px solid #f44336" 
                    : "2px solid rgba(14, 184, 208, 0.3)",
                  borderRadius: "8px",
                  fontSize: "16px",
                  background: "rgba(16, 24, 36, 0.6)",
                  color: "#fff",
                  outline: "none",
                  transition: "all 0.3s",
                  boxSizing: "border-box"
                }}
                onFocus={(e) => {
                  if (!erro) e.currentTarget.style.borderColor = "#0eb8d0";
                  e.currentTarget.style.background = "rgba(16, 24, 36, 0.8)";
                }}
                onBlur={(e) => {
                  if (!erro) e.currentTarget.style.borderColor = "rgba(14, 184, 208, 0.3)";
                  e.currentTarget.style.background = "rgba(16, 24, 36, 0.6)";
                }}
              />
            </div>
          </div>

          {/* Campo Senha */}
          <div style={{ marginBottom: "20px" }}>
            <label style={{
              display: "block",
              fontSize: "14px",
              fontWeight: "600",
              color: "#0eb8d0",
              marginBottom: "8px"
            }}>
              Senha
            </label>
            <div style={{ position: "relative" }}>
              <FiLock style={{
                position: "absolute",
                left: "12px",
                top: "50%",
                transform: "translateY(-50%)",
                color: "#6f42c1",
                fontSize: "18px",
                zIndex: 1
              }} />
              <input
                type={mostrarSenha ? "text" : "password"}
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="Digite sua senha"
                disabled={carregando}
                style={{
                  width: "100%",
                  padding: "12px 45px 12px 40px",
                  border: erro && !senha 
                    ? "2px solid #f44336" 
                    : "2px solid rgba(14, 184, 208, 0.3)",
                  borderRadius: "8px",
                  fontSize: "16px",
                  background: "rgba(16, 24, 36, 0.6)",
                  color: "#fff",
                  outline: "none",
                  transition: "all 0.3s",
                  boxSizing: "border-box"
                }}
                onFocus={(e) => {
                  if (!erro) e.currentTarget.style.borderColor = "#0eb8d0";
                  e.currentTarget.style.background = "rgba(16, 24, 36, 0.8)";
                }}
                onBlur={(e) => {
                  if (!erro) e.currentTarget.style.borderColor = "rgba(14, 184, 208, 0.3)";
                  e.currentTarget.style.background = "rgba(16, 24, 36, 0.6)";
                }}
              />
              <button
                type="button"
                onClick={() => setMostrarSenha(!mostrarSenha)}
                style={{
                  position: "absolute",
                  right: "12px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "#aaffee",
                  padding: "4px",
                  display: "flex",
                  alignItems: "center",
                  opacity: 0.7,
                  transition: "opacity 0.2s"
                }}
                onMouseEnter={(e) => e.currentTarget.style.opacity = "1"}
                onMouseLeave={(e) => e.currentTarget.style.opacity = "0.7"}
              >
                {mostrarSenha ? <FiEyeOff size={20} /> : <FiEye size={20} />}
              </button>
            </div>

            {forcaSenha && (
              <div style={{ marginTop: "8px" }}>
                <div style={{ display: "flex", gap: "4px", marginBottom: "4px" }}>
                  {[0, 1, 2, 3, 4].map((i) => (
                    <div key={i} style={{
                      height: "4px",
                      flex: 1,
                      borderRadius: "2px",
                      background: i < forcaSenha.score ? corForcaSenha(forcaSenha.score) : "rgba(255,255,255,0.15)"
                    }} />
                  ))}
                </div>
                <span style={{ fontSize: "12px", color: corForcaSenha(forcaSenha.score) }}>
                  Força da senha: {textoForcaSenha(forcaSenha.score)}
                </span>
              </div>
            )}

            {modo === "login" && (
              <div style={{ textAlign: "right", marginTop: "8px" }}>
                <button
                  type="button"
                  onClick={() => trocarModo("recuperar")}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#aaffee",
                    cursor: "pointer",
                    fontSize: "12.5px",
                    padding: "2px",
                    opacity: 0.8,
                    textDecoration: "underline"
                  }}
                >
                  Esqueci minha senha
                </button>
              </div>
            )}
          </div>

          {modo === "cadastro" && (
            <div style={{ marginBottom: "20px" }}>
              <label style={{
                display: "block",
                fontSize: "14px",
                fontWeight: "600",
                color: "#0eb8d0",
                marginBottom: "8px"
              }}>
                Confirmar Senha
              </label>
              <div style={{ position: "relative" }}>
                <FiLock style={{
                  position: "absolute",
                  left: "12px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "#6f42c1",
                  fontSize: "18px",
                  zIndex: 1
                }} />
                <input
                  type={mostrarSenha ? "text" : "password"}
                  value={confirmarSenha}
                  onChange={(e) => setConfirmarSenha(e.target.value)}
                  placeholder="Digite a senha novamente"
                  disabled={carregando}
                  style={{
                    width: "100%",
                    padding: "12px 12px 12px 40px",
                    border: erro && confirmarSenha !== senha
                      ? "2px solid #f44336"
                      : "2px solid rgba(14, 184, 208, 0.3)",
                    borderRadius: "8px",
                    fontSize: "16px",
                    background: "rgba(16, 24, 36, 0.6)",
                    color: "#fff",
                    outline: "none",
                    boxSizing: "border-box"
                  }}
                />
              </div>
            </div>
          )}

          {/* Mensagem de Erro */}
          {erro && (
            <div style={{
              padding: "12px",
              background: "rgba(244, 67, 54, 0.15)",
              border: "1px solid rgba(244, 67, 54, 0.5)",
              borderRadius: "8px",
              marginBottom: "20px",
              color: "#ff6b6b",
              fontSize: "14px",
              textAlign: "center"
            }}>
              {erro}
            </div>
          )}

          {/* Botão Principal */}
          <button
            type="submit"
            disabled={carregando}
            style={{
              width: "100%",
              padding: "14px",
              background: carregando 
                ? "rgba(14, 184, 208, 0.3)" 
                : "#0eb8d0",
              color: "#fff",
              border: "none",
              borderRadius: "10px",
              fontSize: "16px",
              fontWeight: "600",
              cursor: carregando ? "not-allowed" : "pointer",
              transition: "all 0.3s",
              marginBottom: "15px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              boxShadow: carregando 
                ? "none" 
                : "0 2px 12px rgba(14, 184, 208, 0.4)",
              letterSpacing: "0.5px"
            }}
            onMouseEnter={(e) => {
              if (!carregando) {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = "0 4px 16px rgba(14, 184, 208, 0.6)";
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              if (!carregando) {
                e.currentTarget.style.boxShadow = "0 2px 12px rgba(14, 184, 208, 0.4)";
              }
            }}
          >
            {carregando && <FiLoader className="spin" size={18} />}
            {carregando 
              ? (modo === "cadastro" ? "Cadastrando..." : "Entrando...")
              : (modo === "cadastro" ? "Criar Conta" : "Entrar")
            }
          </button>

          {/* Alternar entre Login e Cadastro */}
          <div style={{
            textAlign: "center",
            paddingTop: "15px",
            borderTop: "1px solid rgba(14, 184, 208, 0.2)"
          }}>
            <p style={{
              margin: "0 0 10px 0",
              fontSize: "14px",
              color: "#aaffee",
              opacity: 0.8
            }}>
              {modo === "login" 
                ? "Não tem uma conta?"
                : "Já tem uma conta?"
              }
            </p>
            <button
              type="button"
              onClick={() => trocarModo(modo === "login" ? "cadastro" : "login")}
              disabled={carregando}
              style={{
                background: "none",
                border: "none",
                color: "#0eb8d0",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: "600",
                textDecoration: "underline",
                padding: "4px 8px",
                opacity: carregando ? 0.5 : 1,
                transition: "opacity 0.2s"
              }}
              onMouseEnter={(e) => {
                if (!carregando) e.currentTarget.style.color = "#aaffee";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "#0eb8d0";
              }}
            >
              {modo === "login" ? "Cadastre-se aqui" : "Faça login aqui"}
            </button>
          </div>

          {/* Voltar para Home */}
          <div style={{
            textAlign: "center",
            marginTop: "20px",
            paddingTop: "20px",
            borderTop: "1px solid rgba(14, 184, 208, 0.2)"
          }}>
            <button
              type="button"
              onClick={() => navigate("/")}
              style={{
                background: "none",
                border: "none",
                color: "#aaffee",
                cursor: "pointer",
                fontSize: "13px",
                padding: "4px 8px",
                opacity: 0.7,
                transition: "opacity 0.2s"
              }}
              onMouseEnter={(e) => e.currentTarget.style.opacity = "1"}
              onMouseLeave={(e) => e.currentTarget.style.opacity = "0.7"}
            >
              ← Voltar para página inicial
            </button>
          </div>
        </form>
        )}
      </div>

      {/* CSS para animações */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .spin {
          animation: spin 1s linear infinite;
        }
        
        @keyframes logoGlow {
          0% {
            filter: drop-shadow(0 15px 40px #00e0ff90);
          }
          100% {
            filter: drop-shadow(0 15px 50px #00e0ffc0);
          }
        }
        
        input::placeholder {
          color: rgba(170, 255, 238, 0.5);
          opacity: 1;
        }
      `}</style>
    </div>
  );
}