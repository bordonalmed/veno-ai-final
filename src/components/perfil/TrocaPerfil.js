import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiCheck, FiSettings } from "react-icons/fi";
import { carregarDadosPerfil, salvarDadosPerfil, opcoesDePerfil, selecionarCombinacao, perfilAtivo } from "../../utils/perfilLaudo";

// Troca rápida de médico/local: o laudo sai com o logo e os dados escolhidos.

function iniciaisDe(nome, email) {
  return (nome || email || "?").replace(/^(dr|dra)\.?\s+/i, "").split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join("");
}

function trocar(email, op) {
  const d = carregarDadosPerfil(email);
  if (!d) return null;
  const r = salvarDadosPerfil(email, selecionarCombinacao(d, op.medico, op.local));
  return r.ok ? perfilAtivo(r.dados) : null;
}

// Círculo com o logo (ou iniciais) do perfil em uso; com mais de um médico ou
// local, abre a lista para escolher.
export default function TrocaPerfil({ email, onTrocar, completo }) {
  const navigate = useNavigate();
  const [aberto, setAberto] = useState(false);
  const ref = useRef(null);
  const dados = carregarDadosPerfil(email);
  const perfil = dados ? perfilAtivo(dados) : {};
  const opcoes = dados ? opcoesDePerfil(dados) : [];

  useEffect(() => {
    if (!aberto) return undefined;
    const fora = (e) => { if (ref.current && !ref.current.contains(e.target)) setAberto(false); };
    document.addEventListener("pointerdown", fora);
    return () => document.removeEventListener("pointerdown", fora);
  }, [aberto]);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => (opcoes.length > 1 ? setAberto((a) => !a) : navigate("/configuracoes"))}
        title={opcoes.length > 1 ? "Trocar local de atendimento" : "Meu perfil do laudo (logo, assinatura e dados)"}
        style={{
          width: 34, height: 34, borderRadius: "50%", padding: 0, overflow: "hidden", cursor: "pointer",
          border: `2px solid ${completo ? "#3ddc97" : "#0eb8d0"}`,
          background: perfil.logoClinica ? "#fff" : "rgba(14,184,208,0.15)", color: "#0eb8d0",
          fontWeight: 800, fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center",
        }}
      >
        {perfil.logoClinica
          ? <img src={perfil.logoClinica} alt="perfil" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
          : iniciaisDe(perfil.nomeMedico, email)}
      </button>
      {aberto && (
        <div style={{
          position: "absolute", left: 0, top: 42, zIndex: 50, minWidth: 260, maxWidth: "86vw", background: "#151d2c",
          border: "1px solid #2c3a52", borderRadius: 12, boxShadow: "0 12px 36px rgba(0,0,0,0.5)", padding: 6,
        }}>
          <div style={{ fontSize: 11.5, color: "#8fa1b5", padding: "6px 10px" }}>Laudado por:</div>
          {opcoes.map((op) => (
            <button key={`${op.medico}-${op.local}`} type="button"
              onClick={() => { const p = trocar(email, op); setAberto(false); if (p && onTrocar) onTrocar(p); }}
              style={{
                width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", border: "none", borderRadius: 8,
                background: op.ativo ? "rgba(14,184,208,0.14)" : "transparent", color: "#e8eef4", cursor: "pointer", textAlign: "left", fontSize: 13.5,
              }}>
              <span style={{ width: 30, height: 22, borderRadius: 4, background: op.logo ? "#fff" : "#25324a", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, overflow: "hidden" }}>
                {op.logo && <img src={op.logo} alt="" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />}
              </span>
              <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{op.rotulo}</span>
              {op.ativo && <FiCheck color="#3ddc97" />}
            </button>
          ))}
          <button type="button" onClick={() => navigate("/configuracoes")}
            style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", marginTop: 4, border: "none", borderTop: "1px solid #2c3a52", background: "transparent", color: "#0eb8d0", cursor: "pointer", fontSize: 13 }}>
            <FiSettings /> Editar perfil e locais
          </button>
        </div>
      )}
    </div>
  );
}

// Linha "Laudado por: ..." no cabeçalho dos exames, com a troca quando houver
// mais de uma opção.
export function SeletorPerfilLaudo() {
  const email = localStorage.getItem("userEmail") || "";
  const [versao, setVersao] = useState(0);
  const dados = carregarDadosPerfil(email);
  if (!dados) return null;
  const opcoes = opcoesDePerfil(dados);
  const ativo = opcoes.findIndex((o) => o.ativo);
  const estilo = { fontSize: 12.5, color: "#9fb3c8", display: "flex", alignItems: "center", gap: 6, justifyContent: "center", flexWrap: "wrap", margin: "2px 0 8px" };
  if (opcoes.length <= 1) {
    const p = perfilAtivo(dados);
    if (!p.nomeMedico && !p.nomeClinica) return null;
    return <div style={estilo}>Laudado por: <b style={{ color: "#dce6ef" }}>{opcoes[0]?.rotulo}</b></div>;
  }
  return (
    <div style={estilo} data-versao={versao}>
      Laudado por:
      <select
        value={ativo}
        onChange={(e) => { trocar(email, opcoes[Number(e.target.value)]); setVersao((v) => v + 1); }}
        style={{ background: "#f7fbff", color: "#16202c", border: "1.5px solid #0eb8d0", borderRadius: 6, padding: "4px 8px", fontSize: 13, maxWidth: "80vw" }}
      >
        {opcoes.map((o, i) => <option key={i} value={i}>{o.rotulo}</option>)}
      </select>
    </div>
  );
}
