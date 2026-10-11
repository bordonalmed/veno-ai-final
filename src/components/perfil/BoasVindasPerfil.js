import React, { useState } from "react";
import { FiArrowRight, FiArrowLeft, FiCheck, FiX } from "react-icons/fi";
import { carregarDadosPerfil, salvarDadosPerfil, normalizarDados, perfilAtivo, CAMPOS_MEDICO, marcarBoasVindas } from "../../utils/perfilLaudo";
import { TEMA, CampoTexto, grade2, botao, UploadImagem, CampoAssinatura, PreviaLaudo, ESPECIALIDADES } from "./PerfilCampos";

// Assistente de primeiro acesso: 3 passos para personalizar o laudo
// (médico, clínica + logo, assinatura), com a prévia do PDF ao lado.
const PASSOS = ["Médico", "Clínica e logo", "Assinatura"];

export default function BoasVindasPerfil({ email, onFechar }) {
  const [passo, setPasso] = useState(0);
  const [dados, setDados] = useState(() => carregarDadosPerfil(email) || normalizarDados(null));
  const [erro, setErro] = useState("");
  const largura = window.innerWidth;
  const larga = largura >= 900;
  const perfil = perfilAtivo(dados);
  // campos do médico vão para o médico em uso; os da clínica, para o local em uso
  const set = (campo) => (v) => setDados((d) => ({
    ...d,
    medicos: d.medicos.map((m, i) => {
      if (i !== d.medicoAtivo) return m;
      if (CAMPOS_MEDICO.includes(campo)) return { ...m, [campo]: v };
      return { ...m, locais: m.locais.map((l, j) => (j === m.localAtivo ? { ...l, [campo]: v } : l)) };
    }),
  }));

  function salvar(estado) {
    const r = salvarDadosPerfil(email, dados);
    if (!r.ok) { setErro(r.erro); return false; }
    marcarBoasVindas(email, estado);
    return true;
  }
  const pular = () => { marcarBoasVindas(email, "pulado"); onFechar(); };
  const concluir = () => { if (salvar("feito")) onFechar(true); };
  const avancar = () => { if (salvarDadosPerfil(email, dados).ok) setPasso((p) => p + 1); else setErro("Não foi possível salvar."); };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 2000, background: "rgba(6,10,18,0.78)", display: "flex", alignItems: "center", justifyContent: "center", padding: 12, boxSizing: "border-box" }}>
      <div style={{
        background: "#121a28", border: `1px solid ${TEMA.borda}`, borderRadius: 16, width: "100%", maxWidth: larga ? 980 : 560,
        maxHeight: "94vh", overflowY: "auto", color: TEMA.texto, boxShadow: "0 20px 60px rgba(0,0,0,0.5)", fontFamily: "Segoe UI, Inter, Arial, sans-serif",
      }}>
        <div style={{ padding: "18px 22px 12px", borderBottom: `1px solid ${TEMA.borda}`, display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize: "clamp(18px, 2.6vw, 22px)", fontWeight: 800 }}>Bem-vindo ao VENO.AI</div>
            <div style={{ fontSize: 13.5, color: TEMA.suave, marginTop: 2 }}>Em 1 minuto seus laudos saem com seu logo, seus dados e sua assinatura.</div>
          </div>
          <button type="button" onClick={pular} title="Fechar" style={{ background: "transparent", border: "none", color: TEMA.suave, cursor: "pointer", fontSize: 20 }}><FiX /></button>
        </div>

        <div style={{ display: "flex", gap: 6, padding: "14px 22px 0" }}>
          {PASSOS.map((t, i) => (
            <div key={t} style={{ flex: 1 }}>
              <div style={{ height: 5, borderRadius: 3, background: i <= passo ? TEMA.destaque : "#28344a" }} />
              <div style={{ fontSize: 12, marginTop: 5, color: i === passo ? TEMA.destaque : TEMA.suave, fontWeight: i === passo ? 700 : 500 }}>{i + 1}. {t}</div>
            </div>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: larga ? "minmax(0,1fr) 300px" : "1fr", gap: 20, padding: "16px 22px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {passo === 0 && (
              <div style={grade2}>
                <CampoTexto label="Nome que aparece no laudo" value={perfil.nomeMedico} onChange={set("nomeMedico")} placeholder="Dr. João Silva" autoFocus />
                <CampoTexto label="CRM / UF" value={perfil.crm} onChange={set("crm")} placeholder="12345 PR" />
                <CampoTexto label="Especialidade" value={perfil.especialidade} onChange={set("especialidade")} placeholder="Angiologia e Cirurgia Vascular" lista={ESPECIALIDADES} />
              </div>
            )}
            {passo === 1 && (
              <>
                <div style={grade2}>
                  <CampoTexto label="Nome da clínica" value={perfil.nomeClinica} onChange={set("nomeClinica")} placeholder="Clínica Vascular" autoFocus />
                  <CampoTexto label="Telefone" value={perfil.telefoneClinica} onChange={set("telefoneClinica")} placeholder="(43) 99999-9999" type="tel" />
                  <CampoTexto label="Endereço" value={perfil.enderecoClinica} onChange={set("enderecoClinica")} placeholder="Rua, número - bairro - cidade/UF" />
                  <CampoTexto label="E-mail" value={perfil.emailClinica} onChange={set("emailClinica")} placeholder="contato@clinica.com.br" type="email" />
                </div>
                <div>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: TEMA.suave, marginBottom: 6 }}>Logo (opcional)</div>
                  <UploadImagem valor={perfil.logoClinica} onChange={set("logoClinica")} rotulo="Logo" maxW={800} maxH={400} alturaPrevia={70} />
                </div>
              </>
            )}
            {passo === 2 && (
              <div>
                <div style={{ fontSize: 13, color: TEMA.suave, marginBottom: 10 }}>Assine na tela ou envie uma foto da assinatura (opcional).</div>
                <CampoAssinatura valor={perfil.assinaturaMedico} onChange={set("assinaturaMedico")} />
              </div>
            )}
            {erro && <div style={{ color: TEMA.erro, fontSize: 13 }}>{erro}</div>}
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: TEMA.suave }}>Prévia do seu laudo</div>
            <PreviaLaudo perfil={perfil} largura={larga ? 290 : Math.min(260, largura - 70)} />
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, padding: "12px 22px 18px", borderTop: `1px solid ${TEMA.borda}`, flexWrap: "wrap" }}>
          <button type="button" onClick={pular} style={{ background: "transparent", border: "none", color: TEMA.suave, cursor: "pointer", fontSize: 13.5, textDecoration: "underline" }}>Pular por agora</button>
          <div style={{ display: "flex", gap: 8 }}>
            {passo > 0 && <button type="button" style={botao(TEMA.suave, true)} onClick={() => setPasso((p) => p - 1)}><FiArrowLeft /> Voltar</button>}
            {passo < PASSOS.length - 1
              ? <button type="button" style={botao()} onClick={avancar}>Continuar <FiArrowRight /></button>
              : <button type="button" style={botao(TEMA.ok)} onClick={concluir}><FiCheck /> Concluir</button>}
          </div>
        </div>
      </div>
    </div>
  );
}
