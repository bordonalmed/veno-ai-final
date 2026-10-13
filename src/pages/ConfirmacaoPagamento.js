import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiCheck, FiClock, FiRefreshCw, FiAward, FiMail } from "react-icons/fi";
import { sincronizarPlano, ehPremium } from "../services/planoService";

// Depois do pagamento na Hotmart: confere na conta se o Premium já foi
// ativado. Antes esta tela "simulava" a confirmação e ativava o Premium
// depois de 3 cliques em "Verificar novamente", sem pagamento.
const INTERVALO = 15000; // confere sozinha a cada 15 s
const MAX_AUTOMATICAS = 40; // por ~10 minutos

const fundo = {
  minHeight: "100vh", background: "linear-gradient(120deg,#101824 0%,#1c2740 100%)", color: "#fff",
  fontFamily: "Segoe UI, Inter, Arial, sans-serif", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, boxSizing: "border-box",
};
const cartao = (cor) => ({ background: "#1a2332", borderRadius: 14, padding: "34px 28px", textAlign: "center", maxWidth: 480, width: "100%", border: `1px solid ${cor}55`, boxSizing: "border-box" });
const botao = (cor, cheio = true) => ({
  background: cheio ? cor : "transparent", color: cheio ? "#fff" : cor, border: `1.5px solid ${cor}`, borderRadius: 8,
  padding: "11px 18px", fontWeight: 700, fontSize: 14.5, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8,
});

export default function ConfirmacaoPagamento() {
  const navigate = useNavigate();
  const email = localStorage.getItem("userEmail") || "";
  const [status, setStatus] = useState(() => (!email ? "semLogin" : ehPremium(email) ? "confirmado" : "verificando"));
  const automaticas = useRef(0);

  const verificar = useCallback(async () => {
    if (!email) return;
    setStatus((s) => (s === "confirmado" ? s : "verificando"));
    const r = await sincronizarPlano(email).catch(() => ({ premium: ehPremium(email) }));
    setStatus(r.premium ? "confirmado" : "pendente");
  }, [email]);

  useEffect(() => { verificar(); }, [verificar]);

  // enquanto pendente, confere de novo sozinha por alguns minutos
  useEffect(() => {
    if (status !== "pendente" || automaticas.current >= MAX_AUTOMATICAS) return undefined;
    const t = setTimeout(() => { automaticas.current += 1; verificar(); }, INTERVALO);
    return () => clearTimeout(t);
  }, [status, verificar]);

  useEffect(() => { localStorage.removeItem("emailCompraPendente"); }, []);

  if (status === "semLogin") {
    return (
      <div style={fundo}>
        <div style={cartao("#0eb8d0")}>
          <h2 style={{ color: "#0eb8d0", marginTop: 0 }}>Entre na sua conta</h2>
          <p style={{ color: "#c7d4db", lineHeight: 1.5 }}>Entre com o mesmo e-mail usado no pagamento para ver o seu plano.</p>
          <button style={botao("#0eb8d0")} onClick={() => navigate("/login")}>Entrar</button>
        </div>
      </div>
    );
  }

  if (status === "confirmado") {
    return (
      <div style={fundo}>
        <div style={cartao("#11b581")}>
          <FiAward size={46} color="#11b581" />
          <h2 style={{ color: "#11b581", margin: "14px 0 8px" }}>Premium ativo!</h2>
          <p style={{ color: "#c7d4db", lineHeight: 1.5, margin: "0 0 22px" }}>
            Laudos ilimitados, até 3 locais de atendimento e envio de laudos por WhatsApp e e-mail liberados para <strong>{email}</strong>.
          </p>
          <button style={botao("#11b581")} onClick={() => navigate("/home")}><FiCheck /> Começar a usar</button>
        </div>
      </div>
    );
  }

  const verificando = status === "verificando";
  return (
    <div style={fundo}>
      <div style={cartao("#ff9500")}>
        {verificando
          ? <FiRefreshCw size={44} color="#0eb8d0" style={{ animation: "girar 1.4s linear infinite" }} />
          : <FiClock size={44} color="#ff9500" />}
        <h2 style={{ color: verificando ? "#0eb8d0" : "#ff9500", margin: "14px 0 8px" }}>
          {verificando ? "Conferindo seu plano..." : "Aguardando a confirmação do pagamento"}
        </h2>
        <p style={{ color: "#c7d4db", lineHeight: 1.55, margin: "0 0 8px" }}>
          Assim que a Hotmart confirmar o pagamento, o Premium é ativado na conta <strong>{email}</strong>.
          Pagamentos por cartão costumam levar poucos minutos; boleto pode levar até 3 dias úteis.
        </p>
        <p style={{ color: "#8fa1b5", fontSize: 13.5, lineHeight: 1.5, margin: "0 0 22px" }}>
          Use o mesmo e-mail da conta no pagamento. Esta tela confere sozinha de tempos em tempos.
        </p>
        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
          <button style={{ ...botao("#0eb8d0"), opacity: verificando ? 0.6 : 1 }} disabled={verificando} onClick={verificar}><FiRefreshCw /> Verificar agora</button>
          <button style={botao("#8fa1b5", false)} onClick={() => navigate("/home")}>Voltar ao menu</button>
        </div>
        <p style={{ color: "#8fa1b5", fontSize: 12.5, marginTop: 20, display: "flex", gap: 6, alignItems: "center", justifyContent: "center" }}>
          <FiMail /> Já pagou e não ativou? Fale com o suporte do VENO.AI informando o e-mail da compra.
        </p>
      </div>
      <style>{"@keyframes girar { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }"}</style>
    </div>
  );
}
