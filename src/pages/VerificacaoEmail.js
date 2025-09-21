import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { enviarCodigoDesenvolvimento, enviarCodigoVerificacao } from "../services/emailService";

export default function VerificacaoEmail({ email, onVerificacaoCompleta }) {
  const [codigo, setCodigo] = useState("");
  const [erro, setErro] = useState("");
  const [tempoRestante, setTempoRestante] = useState(300); // 5 minutos
  const [codigoEnviado, setCodigoEnviado] = useState(false);
  const [codigoGerado, setCodigoGerado] = useState("");
  const navigate = useNavigate();

  // Gerar código de verificação de 6 dígitos
  function gerarCodigo() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // Enviar código de verificação
  async function enviarCodigoEmail() {
    const codigoVerificacao = gerarCodigo();
    localStorage.setItem('codigoVerificacao', codigoVerificacao);
    localStorage.setItem('emailVerificacao', email);
    localStorage.setItem('tempoExpiracao', Date.now() + 300000); // 5 minutos
    
    // Verificar se está em modo produção ou desenvolvimento
    const isProducao = process.env.NODE_ENV === 'production' || window.location.hostname === 'venoai.xyz';
    
    if (isProducao) {
      // Modo produção - enviar email real
      console.log('Enviando email real para:', email);
      const resultado = await enviarCodigoVerificacao(email, codigoVerificacao);
      
      if (resultado.sucesso) {
        setCodigoEnviado(true);
        setTempoRestante(300);
        setErro("");
        // Mostrar mensagem de sucesso em produção
        alert('Código de verificação enviado para seu email!');
      } else {
        setErro(`Erro ao enviar email: ${resultado.erro}`);
      }
    } else {
      // Modo desenvolvimento - mostrar na tela
      console.log('Modo desenvolvimento - mostrando código na tela');
      enviarCodigoDesenvolvimento(email, codigoVerificacao);
      
      setCodigoGerado(codigoVerificacao);
      setCodigoEnviado(true);
      setTempoRestante(300);
      setErro("");
    }
  }

  // Verificar código
  function verificarCodigo(e) {
    e.preventDefault();
    
    if (!codigo) {
      setErro("Digite o código de verificação!");
      return;
    }

    const codigoArmazenado = localStorage.getItem('codigoVerificacao');
    const emailArmazenado = localStorage.getItem('emailVerificacao');
    const tempoExpiracao = localStorage.getItem('tempoExpiracao');

    console.log('Debug - Código digitado:', codigo);
    console.log('Debug - Código armazenado:', codigoArmazenado);
    console.log('Debug - Email digitado:', email);
    console.log('Debug - Email armazenado:', emailArmazenado);

    if (!codigoArmazenado || !emailArmazenado || !tempoExpiracao) {
      setErro("Código não encontrado. Solicite um novo código.");
      return;
    }

    if (Date.now() > parseInt(tempoExpiracao)) {
      setErro("Código expirado. Solicite um novo código.");
      return;
    }

    if (email !== emailArmazenado) {
      setErro("Email não confere. Tente novamente.");
      return;
    }

    if (codigo !== codigoArmazenado) {
      setErro(`Código incorreto! Digite: ${codigoArmazenado}`);
      return;
    }

    // Código correto - limpar dados temporários
    localStorage.removeItem('codigoVerificacao');
    localStorage.removeItem('emailVerificacao');
    localStorage.removeItem('tempoExpiracao');
    
    console.log('Código verificado com sucesso! Redirecionando...');
    
    // Limpar estado local
    setCodigo("");
    setErro("");
    setCodigoEnviado(false);
    setCodigoGerado("");
    
    // Chamar callback de verificação completa
    onVerificacaoCompleta(email);
  }

  // Reenviar código
  function reenviarCodigo() {
    enviarCodigoEmail();
    setErro("");
  }

  // Timer countdown
  useEffect(() => {
    if (tempoRestante > 0) {
      const timer = setTimeout(() => {
        setTempoRestante(tempoRestante - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [tempoRestante]);

  // Formatar tempo
  function formatarTempo(segundos) {
    const minutos = Math.floor(segundos / 60);
    const segs = segundos % 60;
    return `${minutos}:${segs.toString().padStart(2, '0')}`;
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
      <div style={{
        background: "#181e34",
        borderRadius: 16,
        padding: "32px 38px",
        boxShadow: "0 2px 14px #00e0ff25",
        minWidth: 350,
        color: "#fff",
        display: "flex",
        flexDirection: "column",
        gap: 20,
        textAlign: "center"
      }}>
        <h2 style={{ fontWeight: 800, fontSize: 24, marginBottom: 8 }}>
          Verificação de Email
        </h2>
        
        <p style={{ fontSize: 16, color: "#0eb8d0", marginBottom: 10, fontWeight: 600 }}>
          🆕 Novo Cadastro
        </p>
        
        <p style={{ fontSize: 16, color: "#ccc", marginBottom: 10 }}>
          Enviamos um código de verificação para:
        </p>
        
        <p style={{ 
          fontSize: 18, 
          fontWeight: 600, 
          color: "#0eb8d0",
          marginBottom: 20
        }}>
          {email}
        </p>

        {!codigoEnviado ? (
          <button
            onClick={enviarCodigoEmail}
            style={{
              background: "#0eb8d0",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              padding: "15px 0",
              fontWeight: 600,
              fontSize: 18,
              cursor: "pointer",
              marginBottom: 20
            }}
          >
            Enviar Código de Verificação
          </button>
        ) : (
          <div>
            {process.env.NODE_ENV === 'development' && process.env.REACT_APP_SHOW_TEST_CODE !== 'false' && codigoGerado && (
              <div style={{
                background: "#0eb8d020",
                border: "2px solid #0eb8d0",
                borderRadius: 8,
                padding: "15px",
                marginBottom: "20px",
                textAlign: "center"
              }}>
                <p style={{ margin: 0, fontSize: 14, color: "#0eb8d0", fontWeight: 600 }}>
                  🔍 CÓDIGO GERADO (para teste):
                </p>
                <p style={{ 
                  margin: "10px 0 0 0", 
                  fontSize: 24, 
                  fontWeight: 800, 
                  color: "#fff",
                  letterSpacing: "0.2em"
                }}>
                  {codigoGerado}
                </p>
              </div>
            )}
            
            <form onSubmit={verificarCodigo}>
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: "block", marginBottom: 10, fontSize: 16 }}>
                  Digite o código de 6 dígitos:
                </label>
                <input
                  type="text"
                  value={codigo}
                  onChange={e => setCodigo(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  style={{
                    width: "100%",
                    border: "1px solid #ddd",
                    borderRadius: 7,
                    padding: "15px",
                    fontSize: 24,
                    textAlign: "center",
                    letterSpacing: "0.2em",
                    backgroundColor: "#fff",
                    color: "#333"
                  }}
                  placeholder="000000"
                  maxLength="6"
                  autoFocus
                />
              </div>

              {tempoRestante > 0 && (
                <p style={{ color: "#0eb8d0", fontSize: 14, marginBottom: 15 }}>
                  Código expira em: {formatarTempo(tempoRestante)}
                </p>
              )}

              {erro && (
                <div style={{ color: "#f66", fontSize: 14, marginBottom: 15 }}>
                  {erro}
                </div>
              )}

              <button
                type="submit"
                style={{
                  width: "100%",
                  background: "#0eb8d0",
                  color: "#fff",
                  border: "none",
                  borderRadius: 8,
                  padding: "15px 0",
                  fontWeight: 600,
                  fontSize: 18,
                  cursor: "pointer",
                  marginBottom: 15
                }}
              >
                Verificar Código
              </button>

              <button
                type="button"
                onClick={reenviarCodigo}
                style={{
                  width: "100%",
                  background: "#232f4e",
                  color: "#0eb8d0",
                  border: "none",
                  borderRadius: 8,
                  padding: "12px 0",
                  fontWeight: 600,
                  fontSize: 16,
                  cursor: "pointer",
                  marginBottom: 15
                }}
              >
                Reenviar Código
              </button>
            </form>
          </div>
        )}

        <button
          onClick={() => {
            // Limpar dados de verificação ao voltar
            localStorage.removeItem('codigoVerificacao');
            localStorage.removeItem('emailVerificacao');
            localStorage.removeItem('tempoExpiracao');
            navigate("/login");
          }}
          style={{
            background: "transparent",
            color: "#ccc",
            border: "1px solid #444",
            borderRadius: 8,
            padding: "10px 0",
            fontWeight: 500,
            fontSize: 16,
            cursor: "pointer"
          }}
        >
          Voltar ao Login
        </button>
      </div>
    </div>
  );
}