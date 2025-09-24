import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiArrowLeft, FiCheck, FiStar, FiZap, FiAward } from "react-icons/fi";
import { TrialManager } from "../utils/trialManager";

export default function Planos() {
  const navigate = useNavigate();
  const userEmail = localStorage.getItem("userEmail");
  const planoAtual = userEmail ? TrialManager.verificarPlanoUsuario(userEmail) : null;
  const trialAtual = userEmail ? TrialManager.obterStatusTrial(userEmail) : null;
  
  // Se usuário já tem trial ativo, selecionar Premium por padrão
  const planoInicial = (planoAtual === "trial" && trialAtual?.status === "ativo") ? "premium" : "trial";
  const [planoSelecionado, setPlanoSelecionado] = useState(planoInicial);
  
  const isNovoUsuario = userEmail && !planoAtual;
  const isUpgrade = planoAtual === "trial" && trialAtual?.status === "ativo";

  const planos = [
    {
      id: "trial",
      nome: "Trial Gratuito",
      preco: "R$ 0",
      periodo: "7 dias",
      icone: <FiStar size={24} />,
      cor: "#11b581",
      recursos: [
        "Acesso completo por 7 dias",
        "Até 5 laudos gerados",
        "Todos os templates",
        "Armazenamento local",
        "PDF completo"
      ],
      popular: false,
      trial: true
    },
    {
      id: "premium",
      nome: "Premium",
      preco: "R$ 97",
      periodo: "por mês",
      icone: <FiAward size={24} />,
      cor: "#0eb8d0",
      recursos: [
        "Laudos ilimitados",
        "Uso ilimitado no tempo",
        "Todos os templates",
        "Suporte prioritário",
        "Armazenamento em nuvem",
        "Relatórios detalhados",
        "Templates personalizados"
      ],
      popular: true
    }
  ];

  function handleSelecionarPlano(planoId) {
    setPlanoSelecionado(planoId);
  }

  function handlePagamentoPremium(userEmail) {
    // Salvar email do usuário para depois da compra
    localStorage.setItem("emailCompraPendente", userEmail);
    
    // Link do Hotmart - Configurado
    const hotmartLink = "https://pay.hotmart.com/S102049895B";
    
    // Confirmar redirecionamento
    const confirmar = window.confirm(
      "💎 Plano Premium selecionado!\n\n" +
      "Você será redirecionado para o pagamento seguro via Hotmart.\n" +
      "Após o pagamento, seu plano será ativado automaticamente.\n\n" +
      "Continuar?"
    );
    
    if (confirmar) {
      // Abrir Hotmart em nova aba
      window.open(hotmartLink, "_blank");
      
      // Redirecionar para página de confirmação
      navigate("/confirmacao-pagamento");
    }
  }

  // Função para ativar Premium imediatamente (para teste)
  function ativarPremiumImediatamente(userEmail) {
    const planoAnterior = TrialManager.verificarPlanoUsuario(userEmail);
    TrialManager.definirPlanoUsuario(userEmail, "premium");
    
    if (planoAnterior === "trial") {
      alert("🚀 Upgrade realizado! Seu trial foi convertido para Premium com sucesso!");
    } else {
      alert("💎 Plano Premium ativado com sucesso!");
    }
    
    navigate("/home");
  }

  function handleContratar() {
    const plano = planos.find(p => p.id === planoSelecionado);
    const userEmail = localStorage.getItem("userEmail");
    
    if (planoSelecionado === "trial") {
      if (userEmail) {
        // Usuário já logado - iniciar trial e ir para home
        TrialManager.iniciarTrial(userEmail);
        TrialManager.definirPlanoUsuario(userEmail, "trial");
        alert("🎯 Trial Gratuito iniciado! Você tem 7 dias e 5 laudos para testar todos os recursos.");
        navigate("/home");
      } else {
        // Usuário não logado - redirecionar para login
        alert("🎯 Trial Gratuito selecionado! Faça login para começar seus 7 dias de teste.");
        navigate("/login");
      }
    } else if (planoSelecionado === "premium") {
      if (userEmail) {
        // Redirecionar para Hotmart para pagamento real
        handlePagamentoPremium(userEmail);
      } else {
        // Usuário não logado - redirecionar para login
        alert("💎 Plano Premium selecionado! Faça login para continuar.");
        navigate("/login");
      }
    } else {
      alert(`Plano ${plano?.nome} selecionado! Em breve você receberá instruções por email.`);
    }
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(120deg,#101824 0%,#1c2740 100%)",
      color: "#fff",
      fontFamily: "Segoe UI, Inter, Arial, sans-serif",
      padding: "20px",
      position: "relative"
    }}>
      {/* Botão Voltar - Posição Fixa */}
      <div style={{
        position: "fixed",
        top: 20,
        left: 20,
        zIndex: 9999
      }}>
        <button
          onClick={() => navigate('/')}
          style={{
            background: "#ff6b35",
            color: "#fff",
            border: "none",
            borderRadius: 10,
            padding: "15px 25px",
            fontWeight: 700,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 10,
            fontSize: 16,
            boxShadow: "0 6px 20px rgba(255, 107, 53, 0.4)",
            transition: "all 0.3s ease",
            minWidth: "180px",
            justifyContent: "center"
          }}
          onMouseEnter={(e) => {
            e.target.style.background = "#e55a2b";
            e.target.style.transform = "translateY(-3px)";
            e.target.style.boxShadow = "0 8px 25px rgba(255, 107, 53, 0.6)";
          }}
          onMouseLeave={(e) => {
            e.target.style.background = "#ff6b35";
            e.target.style.transform = "translateY(0)";
            e.target.style.boxShadow = "0 6px 20px rgba(255, 107, 53, 0.4)";
          }}
        >
          <FiArrowLeft size={18} />
          ← VOLTAR AO INÍCIO
        </button>
      </div>

      {/* Conteúdo Principal */}
      <div style={{
        maxWidth: 1200,
        margin: "0 auto",
        paddingTop: 60
      }}>
        {/* Cabeçalho */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          {/* Botão Voltar no Cabeçalho */}
          <div style={{ marginBottom: 20 }}>
            <button
              onClick={() => navigate('/')}
              style={{
                background: "#0eb8d0",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                padding: "12px 24px",
                fontWeight: 600,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                fontSize: 14,
                boxShadow: "0 4px 12px rgba(14, 184, 208, 0.3)",
                transition: "all 0.3s ease"
              }}
              onMouseEnter={(e) => {
                e.target.style.background = "#0ca8b8";
                e.target.style.transform = "translateY(-2px)";
              }}
              onMouseLeave={(e) => {
                e.target.style.background = "#0eb8d0";
                e.target.style.transform = "translateY(0)";
              }}
            >
              <FiArrowLeft size={16} />
              Voltar ao Início
            </button>
          </div>
          
          <h1 style={{
            fontSize: 32,
            fontWeight: 700,
            color: "#0eb8d0",
            marginBottom: 10
          }}>
            💳 Escolha seu Plano
          </h1>
          <p style={{
            fontSize: 18,
            opacity: 0.8,
            maxWidth: 600,
            margin: "0 auto"
          }}>
            {isNovoUsuario 
              ? "🎉 Bem-vindo ao VENO.AI! Escolha seu plano para começar:"
              : isUpgrade
              ? "🚀 Faça upgrade do seu trial para Premium e tenha acesso ilimitado!"
              : "Teste gratuitamente por 7 dias ou aproveite todos os recursos com o plano Premium"
            }
          </p>
        </div>

        {/* Cards dos Planos */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: 24,
          marginBottom: 40,
          maxWidth: 800,
          margin: "0 auto 40px auto"
        }}>
          {planos.map((plano) => (
            <div
              key={plano.id}
              onClick={() => handleSelecionarPlano(plano.id)}
              style={{
                background: planoSelecionado === plano.id ? "#1a2332" : "#0f1419",
                border: planoSelecionado === plano.id ? `2px solid ${plano.cor}` : "1px solid #2a3441",
                borderRadius: 12,
                padding: 24,
                cursor: "pointer",
                transition: "all 0.3s ease",
                position: "relative",
                transform: plano.popular ? "scale(1.05)" : "scale(1)",
                boxShadow: plano.popular ? `0 8px 32px ${plano.cor}40` : "0 4px 16px rgba(0,0,0,0.3)"
              }}
            >
              {/* Badge Popular */}
              {plano.popular && (
                <div style={{
                  position: "absolute",
                  top: -12,
                  left: "50%",
                  transform: "translateX(-50%)",
                  background: plano.cor,
                  color: "#fff",
                  padding: "4px 16px",
                  borderRadius: 20,
                  fontSize: 12,
                  fontWeight: 600
                }}>
                  MAIS POPULAR
                </div>
              )}

              {/* Ícone e Nome */}
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                marginBottom: 16
              }}>
                <div style={{
                  color: plano.cor,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}>
                  {plano.icone}
                </div>
                <h3 style={{
                  fontSize: 20,
                  fontWeight: 600,
                  margin: 0,
                  color: "#fff"
                }}>
                  {plano.nome}
                </h3>
              </div>

              {/* Preço */}
              <div style={{ marginBottom: 20 }}>
                <div style={{
                  fontSize: 32,
                  fontWeight: 700,
                  color: plano.cor,
                  lineHeight: 1
                }}>
                  {plano.preco}
                </div>
                <div style={{
                  fontSize: 14,
                  opacity: 0.7,
                  marginTop: 4
                }}>
                  {plano.periodo}
                </div>
              </div>

              {/* Recursos */}
              <div style={{ marginBottom: 24 }}>
                {plano.recursos.map((recurso, index) => (
                  <div
                    key={index}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      marginBottom: 8,
                      fontSize: 14
                    }}
                  >
                    <FiCheck size={16} color={plano.cor} />
                    <span>{recurso}</span>
                  </div>
                ))}
              </div>

              {/* Botão Selecionar */}
              <button
                style={{
                  width: "100%",
                  background: planoSelecionado === plano.id ? plano.cor : "transparent",
                  color: planoSelecionado === plano.id ? "#fff" : plano.cor,
                  border: `2px solid ${plano.cor}`,
                  borderRadius: 8,
                  padding: "12px 20px",
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 0.3s ease"
                }}
              >
                {planoSelecionado === plano.id ? "Selecionado" : "Selecionar"}
              </button>
            </div>
          ))}
        </div>

        {/* Botão Contratar */}
        <div style={{ textAlign: "center" }}>
          <button
            onClick={handleContratar}
            style={{
              background: "#0eb8d0",
              color: "#fff",
              border: "none",
              borderRadius: 12,
              padding: "16px 32px",
              fontSize: 18,
              fontWeight: 600,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 12,
              boxShadow: "0 4px 16px #0eb8d040",
              transition: "all 0.3s ease"
            }}
            onMouseEnter={(e) => {
              e.target.style.background = "#0ca8b8";
              e.target.style.transform = "translateY(-2px)";
            }}
            onMouseLeave={(e) => {
              e.target.style.background = "#0eb8d0";
              e.target.style.transform = "translateY(0)";
            }}
          >
            <FiCheck size={20} />
            {planoSelecionado === "trial" ? "Começar Trial Gratuito" : "Contratar Premium"}
          </button>
        </div>

      </div>
    </div>
  );
}
