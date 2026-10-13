import React, { useEffect, useState } from 'react';
import { FiTarget, FiAlertTriangle, FiClock } from 'react-icons/fi';
import { FaCrown } from 'react-icons/fa';
import { ehPremium, statusTeste, EVENTO_PLANO_ATUALIZADO, DIAS_TESTE, LAUDOS_TESTE } from '../services/planoService';

const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;

// Faixa do plano no menu: Premium, teste (dias e laudos restantes) ou teste
// encerrado. Atualiza sozinha quando o plano muda (conta / novo laudo).
export default function TrialStatus({ userEmail, onUpgrade }) {
  const ler = () => ({ premium: ehPremium(userEmail), teste: statusTeste(userEmail) });
  const [estado, setEstado] = useState(ler);

  useEffect(() => {
    const atualizar = () => setEstado(ler());
    atualizar();
    window.addEventListener(EVENTO_PLANO_ATUALIZADO, atualizar);
    return () => window.removeEventListener(EVENTO_PLANO_ATUALIZADO, atualizar);
    // eslint-disable-next-line
  }, [userEmail]);

  if (!userEmail) return null;
  const { premium, teste } = estado;

  const faixa = (cor, conteudo, botao) => (
    <div style={{
      background: `${cor}1a`, border: `1px solid ${cor}55`, color: cor, padding: "8px 14px", borderRadius: 8,
      margin: "8px 20px", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 10, flexWrap: "wrap", textAlign: "center",
    }}>
      {conteudo}
      {botao && (
        <button onClick={onUpgrade} style={{ background: cor, color: "#fff", border: "none", borderRadius: 6, padding: "6px 12px", fontWeight: 700, fontSize: 12.5, cursor: "pointer" }}>
          {botao}
        </button>
      )}
    </div>
  );

  if (premium) {
    return faixa("#ff9500", <>
      <span style={{ fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 5 }}><FaCrown /> Plano Premium ativo</span>
      <span style={{ opacity: 0.85 }}>• Laudos ilimitados</span>
    </>);
  }
  if (teste.status === 'nao_iniciado') {
    return faixa("#11b581", <>
      <span style={{ fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 5 }}><FiTarget /> Teste gratuito</span>
      <span style={{ opacity: 0.85 }}>• {DIAS_TESTE} dias ou {LAUDOS_TESTE} laudos, a partir do primeiro laudo</span>
    </>, "Ver planos");
  }
  if (teste.status === 'ativo') {
    return faixa("#0eb8d0", <>
      <span style={{ fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 5 }}><FiClock /> Teste gratuito</span>
      <span style={{ opacity: 0.85 }}>• restam {plural(teste.diasRestantes, "dia", "dias")} e {plural(teste.laudosRestantes, "laudo", "laudos")}</span>
    </>, "Assinar Premium");
  }
  return faixa("#ff6b35", <>
    <span style={{ fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 5 }}><FiAlertTriangle /> Teste gratuito encerrado</span>
    <span style={{ opacity: 0.85 }}>• {teste.motivo === 'laudos' ? `você usou os ${LAUDOS_TESTE} laudos` : `os ${DIAS_TESTE} dias acabaram`}</span>
  </>, "Assinar Premium");
}
