import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FiCheck, FiClock, FiRefreshCw } from "react-icons/fi";
import { TrialManager } from "../utils/trialManager";
import { HotmartService } from "../services/hotmartService";

export default function ConfirmacaoPagamento() {
  const navigate = useNavigate();
  const [status, setStatus] = useState("verificando");
  const [tentativas, setTentativas] = useState(0);
  const userEmail = localStorage.getItem("userEmail");
  const emailCompraPendente = localStorage.getItem("emailCompraPendente");

  useEffect(() => {
    // Simular verificação de pagamento
    verificarPagamento();
    
    // Escutar eventos do webhook do Hotmart
    const handleWebhookEvent = (event) => {
      const { email, transactionId } = event.detail;
      console.log('📨 Webhook recebido:', { email, transactionId });
      
      // Ativar plano Premium
      ativarPlanoPremium();
    };
    
    window.addEventListener('hotmart-payment-approved', handleWebhookEvent);
    
    return () => {
      window.removeEventListener('hotmart-payment-approved', handleWebhookEvent);
    };
  }, []);

  async function verificarPagamento() {
    setStatus("verificando");
    
    try {
      // Verificar se há transação pendente
      const email = userEmail || emailCompraPendente;
      const transacao = HotmartService.obterStatusTransacao(email);
      
      if (transacao && transacao.status === 'active') {
        // Transação já confirmada
        ativarPlanoPremium();
        return;
      }
      
      // Simular verificação com Hotmart (em produção, seria uma chamada real)
      setTimeout(async () => {
        const pagamentoConfirmado = await simularVerificacaoPagamento();
        
        if (pagamentoConfirmado) {
          ativarPlanoPremium();
        } else {
          setStatus("pendente");
        }
      }, 2000);
      
    } catch (error) {
      console.error('Erro ao verificar pagamento:', error);
      setStatus("pendente");
    }
  }

  function simularVerificacaoPagamento() {
    // Simular verificação - em produção, isso seria uma chamada real para Hotmart
    // Por enquanto, vamos simular que o pagamento foi confirmado após algumas tentativas
    return tentativas >= 2;
  }

  function ativarPlanoPremium() {
    const email = userEmail || emailCompraPendente;
    
    if (email) {
      // Verificar se usuário tinha trial ativo
      const trialAtual = TrialManager.obterStatusTrial(email);
      const planoAnterior = TrialManager.verificarPlanoUsuario(email);
      
      // Definir plano premium
      TrialManager.definirPlanoUsuario(email, "premium");
      localStorage.removeItem("emailCompraPendente");
      
      // Se tinha trial ativo, mostrar mensagem de upgrade
      if (planoAnterior === "trial" && trialAtual.status === "ativo") {
        setStatus("upgrade_confirmado");
      } else {
        setStatus("confirmado");
      }
      
      // Redirecionar para home após 3 segundos
      setTimeout(() => {
        navigate("/home");
      }, 3000);
    }
  }

  function tentarNovamente() {
    setTentativas(tentativas + 1);
    verificarPagamento();
  }

  function voltarParaPlanos() {
    navigate("/planos");
  }

  if (status === "verificando") {
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
        <div style={{
          background: "#1a2332",
          borderRadius: 12,
          padding: 40,
          textAlign: "center",
          maxWidth: 500,
          border: "1px solid #0eb8d033"
        }}>
          <FiRefreshCw 
            size={48} 
            color="#0eb8d0" 
            style={{ 
              animation: "spin 2s linear infinite",
              marginBottom: 20 
            }} 
          />
          
          <h2 style={{
            fontSize: 24,
            fontWeight: 600,
            color: "#0eb8d0",
            marginBottom: 16
          }}>
            Verificando Pagamento
          </h2>
          
          <p style={{
            fontSize: 16,
            opacity: 0.8,
            marginBottom: 20
          }}>
            Aguarde enquanto verificamos seu pagamento com o Hotmart...
          </p>
          
          <div style={{
            background: "#0eb8d020",
            borderRadius: 8,
            padding: 16,
            fontSize: 14,
            opacity: 0.9
          }}>
            ⏱️ Isso pode levar alguns minutos
          </div>
        </div>
        
        <style>
          {`
            @keyframes spin {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }
          `}
        </style>
      </div>
    );
  }

  if (status === "pendente") {
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
        <div style={{
          background: "#1a2332",
          borderRadius: 12,
          padding: 40,
          textAlign: "center",
          maxWidth: 500,
          border: "1px solid #ff950033"
        }}>
          <FiClock 
            size={48} 
            color="#ff9500" 
            style={{ marginBottom: 20 }} 
          />
          
          <h2 style={{
            fontSize: 24,
            fontWeight: 600,
            color: "#ff9500",
            marginBottom: 16
          }}>
            Pagamento Pendente
          </h2>
          
          <p style={{
            fontSize: 16,
            opacity: 0.8,
            marginBottom: 20
          }}>
            Seu pagamento ainda está sendo processado. Isso pode levar alguns minutos.
          </p>
          
          <div style={{
            display: "flex",
            flexDirection: "column",
            gap: 12,
            alignItems: "center",
            maxWidth: 300,
            margin: "0 auto"
          }}>
            <button
              onClick={tentarNovamente}
              style={{
                background: "#0eb8d0",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                padding: "12px 24px",
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 8,
                width: "100%",
                justifyContent: "center"
              }}
            >
              <FiRefreshCw size={16} />
              Verificar Novamente
            </button>
            
            <button
              onClick={voltarParaPlanos}
              style={{
                background: "transparent",
                color: "#0eb8d0",
                border: "2px solid #0eb8d0",
                borderRadius: 8,
                padding: "12px 24px",
                fontWeight: 600,
                cursor: "pointer",
                width: "100%"
              }}
            >
              Voltar aos Planos
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (status === "upgrade_confirmado") {
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
        <div style={{
          background: "#1a2332",
          borderRadius: 12,
          padding: 40,
          textAlign: "center",
          maxWidth: 500,
          border: "1px solid #11b58133"
        }}>
          <FiCheck 
            size={48} 
            color="#11b581" 
            style={{ marginBottom: 20 }} 
          />
          
          <h2 style={{
            fontSize: 24,
            fontWeight: 600,
            color: "#11b581",
            marginBottom: 16
          }}>
            Upgrade Realizado!
          </h2>
          
          <p style={{
            fontSize: 16,
            opacity: 0.8,
            marginBottom: 20
          }}>
            🚀 Seu trial foi convertido para Premium com sucesso!
          </p>
          
          <div style={{
            background: "#11b58120",
            borderRadius: 8,
            padding: 16,
            fontSize: 14,
            opacity: 0.9,
            marginBottom: 20
          }}>
            ✅ Trial convertido para Premium<br/>
            ✅ Laudos ilimitados<br/>
            ✅ Todos os templates<br/>
            ✅ Suporte prioritário<br/>
            ✅ Armazenamento em nuvem
          </div>
          
          <p style={{
            fontSize: 14,
            opacity: 0.7
          }}>
            Redirecionando para o dashboard...
          </p>
        </div>
      </div>
    );
  }

  if (status === "confirmado") {
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
        <div style={{
          background: "#1a2332",
          borderRadius: 12,
          padding: 40,
          textAlign: "center",
          maxWidth: 500,
          border: "1px solid #11b58133"
        }}>
          <FiCheck 
            size={48} 
            color="#11b581" 
            style={{ marginBottom: 20 }} 
          />
          
          <h2 style={{
            fontSize: 24,
            fontWeight: 600,
            color: "#11b581",
            marginBottom: 16
          }}>
            Pagamento Confirmado!
          </h2>
          
          <p style={{
            fontSize: 16,
            opacity: 0.8,
            marginBottom: 20
          }}>
            🎉 Seu plano Premium foi ativado com sucesso!
          </p>
          
          <div style={{
            background: "#11b58120",
            borderRadius: 8,
            padding: 16,
            fontSize: 14,
            opacity: 0.9,
            marginBottom: 20
          }}>
            ✅ Laudos ilimitados<br/>
            ✅ Todos os templates<br/>
            ✅ Suporte prioritário<br/>
            ✅ Armazenamento em nuvem
          </div>
          
          <p style={{
            fontSize: 14,
            opacity: 0.7
          }}>
            Redirecionando para o dashboard...
          </p>
        </div>
      </div>
    );
  }

  return null;
}
