import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FiArrowLeft, FiCheck, FiStar, FiZap, FiAward, FiCreditCard } from "react-icons/fi";
import { FaGem } from "react-icons/fa";

const FAQ = [
  {
    pergunta: "O que acontece quando o trial de 7 dias acaba?",
    resposta: "Você pode assinar o Premium a qualquer momento para continuar gerando laudos ilimitados. Seus dados e exames salvos continuam disponíveis."
  },
  {
    pergunta: "Preciso de cartão de crédito para o teste gratuito?",
    resposta: "Não. O Trial Gratuito não pede nenhum dado de pagamento — é só começar a usar."
  },
  {
    pergunta: "Posso cancelar o Premium quando quiser?",
    resposta: "Sim, sem multa ou fidelidade. Você pode cancelar a assinatura a qualquer momento."
  },
  {
    pergunta: "O pagamento é seguro?",
    resposta: "Sim, o pagamento do plano Premium é processado pela Hotmart, uma das maiores plataformas de pagamento do Brasil."
  },
];

export default function Planos() {
  const navigate = useNavigate();
  const userEmail = localStorage.getItem("userEmail");

  const [mostrarConfirmacaoPremium, setMostrarConfirmacaoPremium] = useState(false);

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

  function iniciarTrial() {
    if (userEmail) {
      localStorage.setItem(`plano_${userEmail}`, "trial");
      localStorage.setItem(`trial_${userEmail}`, JSON.stringify({
        inicio: new Date().toISOString(),
        laudosGerados: [],
        status: "ativo"
      }));

      alert("🎯 Trial Gratuito iniciado! Você tem 7 dias e 5 laudos para testar todos os recursos.");
      navigate("/home");
    } else {
      alert("🎯 Trial Gratuito selecionado! Faça login para começar seus 7 dias de teste.");
      navigate("/login");
    }
  }

  function solicitarPremium() {
    if (!userEmail) {
      alert("💎 Plano Premium selecionado! Faça login para continuar.");
      navigate("/login");
      return;
    }
    setMostrarConfirmacaoPremium(true);
  }

  function confirmarPagamentoPremium() {
    localStorage.setItem("emailCompraPendente", userEmail);
    const hotmartLink = "https://pay.hotmart.com/S102049895B";
    window.open(hotmartLink, "_blank");
    setMostrarConfirmacaoPremium(false);
    navigate("/confirmacao-pagamento");
  }

  function handleEscolherPlano(planoId) {
    if (planoId === "trial") iniciarTrial();
    else if (planoId === "premium") solicitarPremium();
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

      {/* Conteúdo Principal */}
      <div style={{
        maxWidth: 1200,
        margin: "0 auto",
        paddingTop: 20
      }}>
        {/* Cabeçalho */}
        <div style={{ textAlign: "center", marginBottom: 30, padding: "0 15px" }}>
          {/* Botão Voltar no Cabeçalho */}
          <div style={{ marginBottom: 15 }}>
            <button
              onClick={() => navigate(userEmail ? '/home' : '/')}
              style={{
                background: "#0eb8d0",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                padding: "10px 20px",
                fontWeight: 600,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                fontSize: "clamp(12px, 3vw, 14px)",
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
              <FiArrowLeft size={14} />
              Voltar ao Início
            </button>
          </div>
          
          <h1 style={{
            fontSize: "clamp(24px, 6vw, 32px)",
            fontWeight: 700,
            color: "#0eb8d0",
            marginBottom: 8,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10
          }}>
            <FiCreditCard /> Escolha seu Plano
          </h1>
          <p style={{
            fontSize: "clamp(14px, 4vw, 18px)",
            opacity: 0.8,
            maxWidth: "90vw",
            margin: "0 auto",
            lineHeight: 1.4
          }}>
            Teste gratuitamente por 7 dias ou aproveite todos os recursos com o plano Premium
          </p>
        </div>

        {/* Cards dos Planos */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: 20,
          marginBottom: 40,
          maxWidth: "90vw",
          margin: "0 auto 40px auto",
          padding: "0 15px"
        }}>
          {planos.map((plano) => (
            <button
              key={plano.id}
              type="button"
              className="planoCard"
              aria-label={`Escolher plano ${plano.nome}`}
              onClick={() => handleEscolherPlano(plano.id)}
              style={{
                background: "#1a2332",
                border: `2px solid ${plano.cor}`,
                borderRadius: 12,
                padding: 24,
                cursor: "pointer",
                transition: "transform 0.2s ease, box-shadow 0.2s ease",
                position: "relative",
                transform: plano.popular ? "scale(1.05)" : "scale(1)",
                boxShadow: plano.popular ? `0 8px 32px ${plano.cor}40` : "0 4px 16px rgba(0,0,0,0.3)",
                textAlign: "left",
                width: "100%",
                fontFamily: "inherit",
                color: "inherit"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = plano.popular ? "scale(1.07) translateY(-2px)" : "scale(1.02) translateY(-2px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = plano.popular ? "scale(1.05)" : "scale(1)";
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

              {/* Chamada para ação (visual apenas — o card inteiro já é o botão) */}
              <div
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  background: plano.cor,
                  color: "#fff",
                  borderRadius: 8,
                  padding: "12px 20px",
                  fontWeight: 600,
                  textAlign: "center",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8
                }}
              >
                <FiCheck size={16} />
                {plano.trial ? "Começar Trial Gratuito" : "Assinar Premium"}
              </div>
            </button>
          ))}
        </div>

        {/* Perguntas frequentes */}
        <div style={{ maxWidth: 700, margin: "0 auto", padding: "0 15px" }}>
          <h2 style={{
            fontSize: "clamp(18px, 4vw, 22px)",
            fontWeight: 700,
            color: "#0eb8d0",
            textAlign: "center",
            marginBottom: 20
          }}>
            Dúvidas frequentes
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 20 }}>
            {FAQ.map((item, i) => (
              <div key={i} style={{
                background: "#0f1419",
                border: "1px solid #2a3441",
                borderRadius: 10,
                padding: "16px 18px"
              }}>
                <div style={{ fontWeight: 600, fontSize: 14.5, color: "#fff", marginBottom: 6 }}>
                  {item.pergunta}
                </div>
                <div style={{ fontSize: 13.5, color: "#9fb3c0", lineHeight: 1.5 }}>
                  {item.resposta}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Confirmação antes de ir para o pagamento do Premium (substitui window.confirm) */}
      {mostrarConfirmacaoPremium && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(8,14,22,0.72)",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16
          }}
          onClick={() => setMostrarConfirmacaoPremium(false)}
        >
          <div
            style={{
              background: "#151b26",
              border: "1px solid #2a3441",
              borderRadius: 14,
              maxWidth: 420,
              width: "100%",
              padding: 24,
              boxShadow: "0 24px 60px rgba(0,0,0,0.4)",
              color: "#fff",
              boxSizing: "border-box"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: 22, marginBottom: 8, display: "flex" }}><FaGem /></div>
            <h3 style={{ margin: "0 0 10px", fontSize: 18, fontWeight: 700, color: "#0eb8d0" }}>
              Plano Premium selecionado
            </h3>
            <p style={{ margin: "0 0 20px", fontSize: 14, lineHeight: 1.5, color: "#c7d4db" }}>
              Você será redirecionado para o pagamento seguro via Hotmart, em uma nova aba.
              Após o pagamento, seu plano será ativado automaticamente.
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => setMostrarConfirmacaoPremium(false)}
                style={{
                  flex: 1,
                  background: "transparent",
                  color: "#9fb3c0",
                  border: "1px solid #2a3441",
                  borderRadius: 8,
                  padding: "10px 16px",
                  fontWeight: 600,
                  cursor: "pointer"
                }}
              >
                Cancelar
              </button>
              <button
                onClick={confirmarPagamentoPremium}
                style={{
                  flex: 1,
                  background: "#0eb8d0",
                  color: "#fff",
                  border: "none",
                  borderRadius: 8,
                  padding: "10px 16px",
                  fontWeight: 600,
                  cursor: "pointer"
                }}
              >
                Continuar para pagamento
              </button>
            </div>
          </div>
        </div>
      )}

      <style>
        {`
          .planoCard:focus-visible {
            outline: 2px solid #4fd8ec;
            outline-offset: 3px;
          }
        `}
      </style>
    </div>
  );
}
