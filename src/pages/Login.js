import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FiEye, FiEyeOff, FiLoader, FiCheck, FiX, FiAlertCircle } from "react-icons/fi";
import { AuthService } from "../services/authService";
import QuickSyncLogin from "../components/QuickSyncLogin";

export default function Login({ onLogin, onCadastrar }) {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [erroEmail, setErroEmail] = useState("");
  const [erroSenha, setErroSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [validacaoEmail, setValidacaoEmail] = useState({ valido: false, mensagem: "" });
  const [validacaoSenha, setValidacaoSenha] = useState({ valido: false, mensagem: "", score: 0 });
  const navigate = useNavigate();

  // Função para validar email com formato rigoroso mas flexível
  function validarEmail(email) {
    if (!email) return { valido: false, mensagem: "Email é obrigatório" };
    
    // Regex rigorosa para validação de formato de email
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    
    if (!emailRegex.test(email)) {
      return { valido: false, mensagem: "Formato de email inválido!" };
    }

    // Verificar se o domínio tem pelo menos 2 caracteres após o ponto
    const dominio = email.split('@')[1];
    if (!dominio || dominio.split('.').length < 2) {
      return { valido: false, mensagem: "Domínio de email inválido!" };
    }

    // Verificar se a parte após o último ponto tem pelo menos 2 caracteres
    const extensao = dominio.split('.').pop();
    if (extensao.length < 2) {
      return { valido: false, mensagem: "Extensão do domínio deve ter pelo menos 2 caracteres!" };
    }

    // Verificar se o domínio não contém caracteres inválidos
    if (!/^[a-zA-Z0-9.-]+$/.test(dominio)) {
      return { valido: false, mensagem: "Domínio contém caracteres inválidos!" };
    }

    // Verificar se não há pontos consecutivos
    if (dominio.includes('..')) {
      return { valido: false, mensagem: "Domínio não pode ter pontos consecutivos!" };
    }

    // Verificar se não começa ou termina com ponto ou hífen
    if (dominio.startsWith('.') || dominio.endsWith('.') || 
        dominio.startsWith('-') || dominio.endsWith('-')) {
      return { valido: false, mensagem: "Domínio não pode começar ou terminar com ponto ou hífen!" };
    }

    return { valido: true, mensagem: "Email válido" };
  }

  // Função para validar senha
  function validarSenha(senha) {
    if (!senha) return { valido: false, mensagem: "Senha é obrigatória", score: 0 };
    
    const validation = AuthService.validatePasswordStrength(senha);
    const score = AuthService.calculatePasswordScore(senha);
    
    return {
      valido: validation.isValid,
      mensagem: validation.isValid ? "Senha válida" : validation.errors.join(", "),
      score: score
    };
  }

  async function handleEntrar(e) {
    e.preventDefault();
    
    if (carregando) return;
    
    console.log('Tentativa de login - Email:', email, 'Senha:', senha);
    
    // Limpar erros anteriores
    setErro("");
    setErroEmail("");
    setErroSenha("");
    
    if (!email || !senha) {
      setErro("Preencha todos os campos!");
      return;
    }

    // Validar email
    const validacaoEmailResult = validarEmail(email);
    if (!validacaoEmailResult.valido) {
      setErro(validacaoEmailResult.mensagem);
      setErroEmail(validacaoEmailResult.mensagem);
      return;
    }

    // Validar senha
    const validacaoSenhaResult = validarSenha(senha);
    if (!validacaoSenhaResult.valido) {
      setErro(validacaoSenhaResult.mensagem);
      setErroSenha(validacaoSenhaResult.mensagem);
      return;
    }

    setCarregando(true);
    
    try {
      console.log('Chamando onLogin com:', email, senha);
      await onLogin(email, senha);
    } catch (error) {
      console.error('Erro no login:', error);
      setErro(error.message || "Erro ao fazer login. Tente novamente.");
    } finally {
      setCarregando(false);
    }
  }

  async function handleCadastrar(e) {
    e.preventDefault();
    
    if (carregando) return;
    
    console.log('Tentativa de cadastro - Email:', email, 'Senha:', senha);
    
    // Limpar erros anteriores
    setErro("");
    setErroEmail("");
    setErroSenha("");
    
    if (!email || !senha) {
      setErro("Preencha todos os campos!");
      return;
    }

    // Validar email
    const validacaoEmailResult = validarEmail(email);
    if (!validacaoEmailResult.valido) {
      setErro(validacaoEmailResult.mensagem);
      setErroEmail(validacaoEmailResult.mensagem);
      return;
    }

    // Validar senha
    const validacaoSenhaResult = validarSenha(senha);
    if (!validacaoSenhaResult.valido) {
      setErro(validacaoSenhaResult.mensagem);
      setErroSenha(validacaoSenhaResult.mensagem);
      return;
    }

    setCarregando(true);
    
    try {
    console.log('Chamando onCadastrar com:', email, senha);
      await onCadastrar(email, senha);
    } catch (error) {
      console.error('Erro no cadastro:', error);
      setErro(error.message || "Erro ao cadastrar usuário. Tente novamente.");
    } finally {
      setCarregando(false);
    }
  }

  // Função para validar email em tempo real
  function handleEmailChange(e) {
    const novoEmail = e.target.value;
    setEmail(novoEmail);
    
    // Limpar erros quando está digitando
    if (erroEmail) {
      setErroEmail("");
    }
    if (erro) {
      setErro("");
    }
    
    // Validar em tempo real
    if (novoEmail && novoEmail.includes('@')) {
      const validacao = validarEmail(novoEmail);
      setValidacaoEmail(validacao);
    } else {
      setValidacaoEmail({ valido: false, mensagem: "" });
    }
  }

  // Função para validar senha em tempo real
  function handleSenhaChange(e) {
    const novaSenha = e.target.value;
    setSenha(novaSenha);
    
    // Limpar erros quando está digitando
    if (erroSenha) {
      setErroSenha("");
    }
    if (erro) {
      setErro("");
    }
    
    // Validar em tempo real
    if (novaSenha) {
      const validacao = validarSenha(novaSenha);
      setValidacaoSenha(validacao);
    } else {
      setValidacaoSenha({ valido: false, mensagem: "", score: 0 });
    }
  }

  // Função para validar quando o usuário sai do campo
  function handleEmailBlur(e) {
    const email = e.target.value;
    if (email && email.includes('@')) {
      const validacao = validarEmail(email);
      setValidacaoEmail(validacao);
      if (!validacao.valido) {
        setErroEmail(validacao.mensagem);
      }
    }
  }

  // Função para alternar visibilidade da senha
  function toggleMostrarSenha() {
    setMostrarSenha(!mostrarSenha);
  }

  // Função para obter cor da barra de força da senha
  function getPasswordStrengthColor(score) {
    if (score <= 1) return "#ff4444";
    if (score <= 2) return "#ff8800";
    if (score <= 3) return "#ffbb00";
    if (score <= 4) return "#88cc00";
    return "#00cc44";
  }

  // Função para obter texto da força da senha
  function getPasswordStrengthText(score) {
    if (score <= 1) return "Muito fraca";
    if (score <= 2) return "Fraca";
    if (score <= 3) return "Média";
    if (score <= 4) return "Forte";
    return "Muito forte";
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(120deg,#101824 0%,#1c2740 100%)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center"
    }}>
      <form
        style={{
          background: "#181e34",
          borderRadius: 16,
          padding: "32px 38px",
          boxShadow: "0 2px 14px #00e0ff25",
          minWidth: 310,
          color: "#fff",
          display: "flex",
          flexDirection: "column",
          gap: 14
        }}
      >
        <h2 style={{ textAlign: "center", fontWeight: 800, fontSize: 24, marginBottom: 8 }}>Acesso ao Sistema</h2>
        <p style={{ 
          textAlign: "center", 
          fontSize: 14, 
          color: "#ccc", 
          marginBottom: 20,
          lineHeight: "1.4"
        }}>
          <strong>Novo usuário:</strong> Cadastre-se para começar<br/>
          <strong>Usuário existente:</strong> Faça login para continuar
        </p>
        <label style={{ color: "#fff", fontWeight: "600" }}>Email<br />
          <div style={{ position: "relative" }}>
          <input
            type="email"
            value={email}
            onChange={handleEmailChange}
            onBlur={handleEmailBlur}
            style={{
              width: "100%",
                border: erroEmail ? "2px solid #f66" : validacaoEmail.valido ? "2px solid #11b581" : "1px solid #ddd",
              borderRadius: 7,
                padding: "10px 40px 10px 10px",
              fontSize: 17,
              marginTop: 3,
                backgroundColor: erroEmail ? "#ff666620" : validacaoEmail.valido ? "#11b58120" : "#fff",
                color: "#000",
                transition: "all 0.3s ease",
                fontWeight: "500"
            }}
            autoFocus
            placeholder="exemplo@gmail.com"
              disabled={carregando}
            />
            {validacaoEmail.valido && (
              <div style={{
                position: "absolute",
                right: 12,
                top: "50%",
                transform: "translateY(-50%)",
                color: "#11b581"
              }}>
                <FiCheck size={20} />
              </div>
            )}
            {erroEmail && (
              <div style={{
                position: "absolute",
                right: 12,
                top: "50%",
                transform: "translateY(-50%)",
                color: "#f66"
              }}>
                <FiX size={20} />
              </div>
            )}
          </div>
          {erroEmail && <div style={{ color: "#f66", fontSize: 14, marginTop: 4, display: "flex", alignItems: "center" }}>
            <FiAlertCircle size={16} style={{ marginRight: 4 }} />
            {erroEmail}
          </div>}
          {validacaoEmail.valido && !erroEmail && (
            <div style={{ color: "#11b581", fontSize: 14, marginTop: 4, display: "flex", alignItems: "center" }}>
              <FiCheck size={16} style={{ marginRight: 4 }} />
              Email válido
            </div>
          )}
        </label>
        <label style={{ color: "#fff", fontWeight: "600" }}>Senha<br />
          <div style={{ position: "relative" }}>
            <input
              type={mostrarSenha ? "text" : "password"}
              value={senha}
              onChange={handleSenhaChange}
              style={{
                width: "100%",
                border: erroSenha ? "2px solid #f66" : validacaoSenha.valido ? "2px solid #11b581" : "1px solid #ddd",
                borderRadius: 7,
                padding: "10px 80px 10px 10px",
                fontSize: 17,
                marginTop: 3,
                backgroundColor: erroSenha ? "#ff666620" : validacaoSenha.valido ? "#11b58120" : "#fff",
                color: "#000",
                transition: "all 0.3s ease",
                fontWeight: "500"
              }}
              placeholder="Mínimo 6 caracteres"
              disabled={carregando}
            />
            <button
              type="button"
              onClick={toggleMostrarSenha}
              style={{
                position: "absolute",
                right: 40,
                top: "50%",
                transform: "translateY(-50%)",
                background: "transparent",
                border: "none",
                color: "#666",
                cursor: "pointer",
                padding: 4
              }}
              disabled={carregando}
            >
              {mostrarSenha ? <FiEyeOff size={20} /> : <FiEye size={20} />}
            </button>
            {validacaoSenha.valido && (
              <div style={{
                position: "absolute",
                right: 12,
                top: "50%",
                transform: "translateY(-50%)",
                color: "#11b581"
              }}>
                <FiCheck size={20} />
              </div>
            )}
            {erroSenha && (
              <div style={{
                position: "absolute",
                right: 12,
                top: "50%",
                transform: "translateY(-50%)",
                color: "#f66"
              }}>
                <FiX size={20} />
              </div>
            )}
          </div>
          
          {/* Barra de força da senha */}
          {senha && (
            <div style={{ marginTop: 8 }}>
              <div style={{
                display: "flex",
                alignItems: "center",
                marginBottom: 4
              }}>
                <div style={{
                  flex: 1,
                  height: 4,
                  backgroundColor: "#e0e0e0",
                  borderRadius: 2,
                  overflow: "hidden"
                }}>
                  <div style={{
                    height: "100%",
                    width: `${(validacaoSenha.score / 5) * 100}%`,
                    backgroundColor: getPasswordStrengthColor(validacaoSenha.score),
                    transition: "all 0.3s ease"
                  }} />
                </div>
                <span style={{
                  marginLeft: 8,
                  fontSize: 12,
                  color: getPasswordStrengthColor(validacaoSenha.score),
                  fontWeight: 600
                }}>
                  {getPasswordStrengthText(validacaoSenha.score)}
                </span>
              </div>
            </div>
          )}
          
          {erroSenha && <div style={{ color: "#f66", fontSize: 14, marginTop: 4, display: "flex", alignItems: "center" }}>
            <FiAlertCircle size={16} style={{ marginRight: 4 }} />
            {erroSenha}
          </div>}
          {validacaoSenha.valido && !erroSenha && (
            <div style={{ color: "#11b581", fontSize: 14, marginTop: 4, display: "flex", alignItems: "center" }}>
              <FiCheck size={16} style={{ marginRight: 4 }} />
              Senha válida
            </div>
          )}
        </label>
        {erro && <div style={{ color: "#f66", fontWeight: 700, display: "flex", alignItems: "center", padding: "8px 12px", backgroundColor: "#ff666620", borderRadius: 6, marginTop: 8 }}>
          <FiAlertCircle size={16} style={{ marginRight: 8 }} />
          {erro}
        </div>}
        
        <div style={{ display: "flex", gap: "10px", marginTop: 8 }}>
          <button
            type="button"
            onClick={handleCadastrar}
            disabled={carregando || !validacaoEmail.valido || !validacaoSenha.valido}
            style={{
              flex: 1,
              background: carregando || !validacaoEmail.valido || !validacaoSenha.valido ? "#666" : "#0eb8d0",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              padding: "13px 0",
              fontWeight: 600,
              fontSize: 16,
              boxShadow: carregando || !validacaoEmail.valido || !validacaoSenha.valido ? "none" : "0 2px 8px #00e0ff30",
              cursor: carregando || !validacaoEmail.valido || !validacaoSenha.valido ? "not-allowed" : "pointer",
              transition: "all 0.3s ease",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8
            }}
          >
            {carregando ? <FiLoader className="animate-spin" size={18} /> : null}
            {carregando ? "Cadastrando..." : "Novo Usuário"}
          </button>
          <button
            type="button"
            onClick={handleEntrar}
            disabled={carregando || !validacaoEmail.valido || !validacaoSenha.valido}
            style={{
              flex: 1,
              background: carregando || !validacaoEmail.valido || !validacaoSenha.valido ? "#444" : "#232f4e",
              color: carregando || !validacaoEmail.valido || !validacaoSenha.valido ? "#999" : "#0eb8d0",
              border: carregando || !validacaoEmail.valido || !validacaoSenha.valido ? "2px solid #666" : "2px solid #0eb8d0",
              borderRadius: 8,
              padding: "13px 0",
              fontWeight: 600,
              fontSize: 16,
              cursor: carregando || !validacaoEmail.valido || !validacaoSenha.valido ? "not-allowed" : "pointer",
              transition: "all 0.3s ease",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8
            }}
          >
            {carregando ? <FiLoader className="animate-spin" size={18} /> : null}
            {carregando ? "Entrando..." : "Fazer Login"}
          </button>
        </div>
        
        {/* Componente de Sincronização Rápida */}
        <QuickSyncLogin />
        
        <button
          type="button"
          style={{
            marginTop: 8,
            background: "transparent",
            color: "#ccc",
            border: "1px solid #444",
            borderRadius: 8,
            padding: "10px 0",
            fontWeight: 600,
            fontSize: 14,
            cursor: "pointer"
          }}
          onClick={() => navigate("/")}
        >
          Voltar à página inicial
        </button>
      </form>
      
      {/* CSS para animações e melhorias de contraste */}
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          .animate-spin {
            animation: spin 1s linear infinite;
          }
          
          /* Melhorar contraste dos inputs */
          input[type="email"], input[type="password"], input[type="text"] {
            color: #000 !important;
            font-weight: 500 !important;
          }
          
          input[type="email"]::placeholder, 
          input[type="password"]::placeholder, 
          input[type="text"]::placeholder {
            color: #666 !important;
            opacity: 1 !important;
            font-weight: 400 !important;
          }
          
          /* Garantir fundo branco nos inputs */
          input[type="email"], input[type="password"], input[type="text"] {
            background-color: #fff !important;
          }
          
          /* Estados de erro e validação */
          input[type="email"].error, input[type="password"].error {
            background-color: #ff666620 !important;
            color: #000 !important;
          }
          
          input[type="email"].valid, input[type="password"].valid {
            background-color: #11b58120 !important;
            color: #000 !important;
          }
        `}
      </style>
    </div>
  );
} 