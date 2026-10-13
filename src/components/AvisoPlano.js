import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaGem } from "react-icons/fa";
import { FiX } from "react-icons/fi";
import { EVENTO_LIMITE_PLANO, DIAS_TESTE, LAUDOS_TESTE } from "../services/planoService";

// Janela "Seu teste gratuito terminou", aberta quando um laudo novo é
// bloqueado (salvar, PDF, TXT ou enviar). Os exames já feitos continuam
// disponíveis em Exames Realizados.
export default function AvisoPlano() {
  const navigate = useNavigate();
  const [motivo, setMotivo] = useState(null);

  useEffect(() => {
    const f = (e) => setMotivo(e.detail?.motivo || "tempo");
    window.addEventListener(EVENTO_LIMITE_PLANO, f);
    return () => window.removeEventListener(EVENTO_LIMITE_PLANO, f);
  }, []);

  if (!motivo) return null;
  const ir = (rota) => { setMotivo(null); navigate(rota); };
  const texto = motivo === "laudos"
    ? `Você usou os ${LAUDOS_TESTE} laudos do teste gratuito.`
    : `Os ${DIAS_TESTE} dias do teste gratuito terminaram.`;

  return (
    <div onClick={() => setMotivo(null)} style={{ position: "fixed", inset: 0, zIndex: 4000, background: "rgba(6,10,18,0.8)", display: "flex", alignItems: "center", justifyContent: "center", padding: 14, boxSizing: "border-box" }}>
      <div role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()} style={{ position: "relative", background: "#151d2c", border: "1px solid #2c3a52", borderRadius: 14, maxWidth: 430, width: "100%", padding: "24px 22px", color: "#e8eef4", fontFamily: "Segoe UI, Inter, Arial, sans-serif", boxSizing: "border-box" }}>
        <button type="button" onClick={() => setMotivo(null)} title="Fechar" style={{ position: "absolute", right: 12, top: 12, background: "transparent", border: "none", color: "#8fa1b5", fontSize: 20, cursor: "pointer" }}><FiX /></button>
        <div style={{ color: "#0eb8d0", fontSize: 26, display: "flex" }}><FaGem /></div>
        <h3 style={{ margin: "10px 0 8px", fontSize: 19, fontWeight: 800 }}>Seu teste gratuito terminou</h3>
        <p style={{ margin: "0 0 6px", fontSize: 14.5, lineHeight: 1.5, color: "#c7d4db" }}>{texto}</p>
        <p style={{ margin: "0 0 20px", fontSize: 14, lineHeight: 1.5, color: "#8fa1b5" }}>
          Assine o Premium para continuar gerando laudos. Seus exames já feitos continuam disponíveis em Exames Realizados.
        </p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button type="button" onClick={() => ir("/planos")} style={{ flex: "1 1 160px", background: "#0eb8d0", color: "#fff", border: "none", borderRadius: 8, padding: "11px 14px", fontWeight: 700, fontSize: 14.5, cursor: "pointer" }}>Assinar Premium</button>
          <button type="button" onClick={() => ir("/exames-realizados")} style={{ flex: "1 1 160px", background: "transparent", color: "#9fb3c0", border: "1px solid #2c3a52", borderRadius: 8, padding: "11px 14px", fontWeight: 600, fontSize: 14.5, cursor: "pointer" }}>Ver meus exames</button>
        </div>
      </div>
    </div>
  );
}
