import React, { useEffect, useRef, useState } from "react";
import { saveAs } from "file-saver";
import { FiX, FiShare2, FiMessageCircle, FiMail, FiCheckCircle, FiAlertTriangle, FiLoader, FiArrowLeft, FiSend } from "react-icons/fi";
import {
  lerModeloMensagem, montarMensagem, normalizarTelefone, mascararTelefone, emailValido,
  podeCompartilharArquivo, compartilharPdf, linkWhatsApp, linkEmail,
} from "../utils/envioLaudo";
import { formatarDataDiaMesAno } from "../utils/pdfExameSalvo";

const COR = { fundo: "#151d2c", borda: "#2c3a52", texto: "#e8eef4", suave: "#8fa1b5", destaque: "#0eb8d0", whats: "#25D366", erro: "#ff7c7c", ok: "#3ddc97" };
const campo = { width: "100%", boxSizing: "border-box", padding: "10px 12px", borderRadius: 8, border: "1.5px solid #2f6f86", background: "#f7fbff", color: "#16202c", fontSize: 14 };
const botao = (cor, cheio = true) => ({
  background: cheio ? cor : "transparent", color: cheio ? "#fff" : cor, border: `1.5px solid ${cor}`, borderRadius: 8,
  padding: "10px 14px", fontWeight: 700, fontSize: 14, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, whiteSpace: "nowrap",
});

// Janela "Enviar laudo": compartilhar com o PDF anexado (celular), ou abrir o
// WhatsApp / e-mail com a mensagem pronta e o PDF baixado para anexar.
// obterPdf: async () => ({ blob, nomeArquivo }) | null
export default function EnviarLaudo({ aberto, onFechar, obterPdf, info, telefoneInicial, emailInicial, onEnviado }) {
  const [pdf, setPdf] = useState(null);
  const [erroPdf, setErroPdf] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");
  const [aviso, setAviso] = useState(null); // { tipo: "ok"|"erro", texto }
  const [canal, setCanal] = useState(null); // null (escolher) | "whatsapp" | "email"
  const gerando = useRef(false);
  // compartilhar com o arquivo só no celular/tablet (no Windows abria o painel do sistema)
  const compartilhar = podeCompartilharArquivo() && typeof window !== "undefined" && window.matchMedia?.("(pointer: coarse)").matches;

  useEffect(() => {
    if (!aberto) { setPdf(null); setErroPdf(""); setAviso(null); setCanal(null); gerando.current = false; return; }
    setMensagem(montarMensagem(lerModeloMensagem(), {
      paciente: info?.paciente, tipoNome: info?.tipoNome, data: info?.data,
      clinica: info?.clinica ?? localStorage.getItem("nomeClinica"),
      medico: localStorage.getItem("nomeMedico"), crm: localStorage.getItem("crm"),
    }));
    setTelefone(mascararTelefone(telefoneInicial || ""));
    setEmail(emailInicial || "");
    // o PDF fica pronto antes do clique: o compartilhamento do celular só
    // abre se for chamado direto pelo toque
    if (!gerando.current) {
      gerando.current = true;
      Promise.resolve(obterPdf())
        .then((r) => (r?.blob ? setPdf(r) : setErroPdf("Preencha o exame antes de enviar (nome, idade e data).")))
        .catch(() => setErroPdf("Não foi possível gerar o PDF."));
    }
    // eslint-disable-next-line
  }, [aberto]);

  if (!aberto) return null;

  const baixar = () => { if (pdf) saveAs(pdf.blob, pdf.nomeArquivo); };
  const registrar = (via) => onEnviado && onEnviado(via, { telefone: telefone.replace(/\D/g, ""), email: email.trim() });

  async function aoCompartilhar() {
    if (!pdf) return;
    try {
      await compartilharPdf({ blob: pdf.blob, nomeArquivo: pdf.nomeArquivo, texto: mensagem, titulo: `Laudo - ${info?.paciente || ""}` });
      registrar("compartilhado");
      setAviso({ tipo: "ok", texto: "Laudo compartilhado." });
    } catch (e) {
      if (e?.name !== "AbortError") setAviso({ tipo: "erro", texto: "O aparelho não conseguiu compartilhar. Use o botão Enviar pelo WhatsApp." });
    }
  }

  function aoWhatsApp() {
    const t = normalizarTelefone(telefone);
    if (!t.ok) { setAviso({ tipo: "erro", texto: t.erro }); return; }
    baixar();
    window.open(linkWhatsApp(t.numero, mensagem), "_blank", "noopener,noreferrer");
    registrar("whatsapp");
    setAviso({ tipo: "ok", texto: "WhatsApp aberto com a mensagem. O PDF foi baixado: anexe na conversa pelo clipe (📎)." });
  }

  function aoEmail() {
    if (!emailValido(email)) { setAviso({ tipo: "erro", texto: "E-mail do paciente inválido." }); return; }
    baixar();
    const assunto = `Laudo - ${info?.paciente || "exame"}${info?.data ? ` - ${formatarDataDiaMesAno(info.data)}` : ""}`;
    window.location.href = linkEmail(email, assunto, mensagem);
    registrar("email");
    setAviso({ tipo: "ok", texto: "E-mail aberto com a mensagem. O PDF foi baixado: anexe ao e-mail." });
  }

  const pronto = !!pdf;
  const voltar = () => { setCanal(null); setAviso(null); };
  const titulo = { whatsapp: "Enviar por WhatsApp", email: "Enviar por e-mail" }[canal] || "Enviar laudo";
  const opcao = (cor) => ({
    flex: "1 1 180px", background: `${cor}14`, border: `1.5px solid ${cor}`, borderRadius: 12, color: COR.texto, cursor: "pointer",
    padding: "20px 14px", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, fontSize: 16, fontWeight: 700,
  });
  return (
    <div onClick={onFechar} style={{ position: "fixed", inset: 0, zIndex: 3000, background: "rgba(6,10,18,0.78)", display: "flex", alignItems: "center", justifyContent: "center", padding: 12, boxSizing: "border-box" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: COR.fundo, border: `1px solid ${COR.borda}`, borderRadius: 14, width: "100%", maxWidth: 480, maxHeight: "94vh", overflowY: "auto", color: COR.texto, fontFamily: "Segoe UI, Inter, Arial, sans-serif" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, padding: "16px 18px 10px", borderBottom: `1px solid ${COR.borda}` }}>
          <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
            {canal && <button type="button" onClick={voltar} title="Voltar" style={{ background: "transparent", border: "none", color: COR.suave, fontSize: 20, cursor: "pointer", padding: "2px 4px 0 0" }}><FiArrowLeft /></button>}
            <div>
              <div style={{ fontSize: 18, fontWeight: 800 }}>{titulo}</div>
              <div style={{ fontSize: 13, color: COR.suave, marginTop: 2 }}>
                {[info?.paciente, info?.tipoNome, formatarDataDiaMesAno(info?.data)].filter(Boolean).join(" · ")}
              </div>
            </div>
          </div>
          <button type="button" onClick={onFechar} title="Fechar" style={{ background: "transparent", border: "none", color: COR.suave, fontSize: 20, cursor: "pointer" }}><FiX /></button>
        </div>

        <div style={{ padding: "16px 18px 18px", display: "flex", flexDirection: "column", gap: 14 }}>
          {erroPdf && <div style={{ color: COR.erro, fontSize: 13.5, display: "flex", gap: 6, alignItems: "center" }}><FiAlertTriangle /> {erroPdf}</div>}

          {!canal && (
            <>
              <div style={{ fontSize: 14, color: COR.suave }}>Como você quer enviar o laudo?</div>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <button type="button" onClick={() => setCanal("whatsapp")} style={opcao(COR.whats)}>
                  <FiMessageCircle size={30} color={COR.whats} /> WhatsApp
                </button>
                <button type="button" onClick={() => setCanal("email")} style={opcao(COR.destaque)}>
                  <FiMail size={30} color={COR.destaque} /> E-mail
                </button>
              </div>
            </>
          )}

          {canal === "whatsapp" && (
            <div>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: COR.suave, marginBottom: 5 }}>WhatsApp do paciente</div>
              <input type="tel" inputMode="tel" autoFocus value={telefone} onChange={(e) => setTelefone(mascararTelefone(e.target.value))}
                onKeyDown={(e) => e.key === "Enter" && aoWhatsApp()} placeholder="(43) 99999-9999" style={{ ...campo, fontSize: 16 }} />
            </div>
          )}

          {canal === "email" && (
            <div>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: COR.suave, marginBottom: 5 }}>E-mail do paciente</div>
              <input type="email" autoFocus value={email} onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && aoEmail()} placeholder="paciente@email.com" style={{ ...campo, fontSize: 16 }} />
            </div>
          )}

          {canal && (
            <>
              <div>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: COR.suave, marginBottom: 5 }}>Mensagem</div>
                <textarea value={mensagem} onChange={(e) => setMensagem(e.target.value)} rows={4} style={{ ...campo, resize: "vertical", fontFamily: "inherit" }} />
              </div>
              <button type="button" disabled={!pronto} onClick={canal === "whatsapp" ? aoWhatsApp : aoEmail}
                style={{ ...botao(canal === "whatsapp" ? COR.whats : COR.destaque), width: "100%", padding: "13px 14px", fontSize: 15.5, opacity: pronto ? 1 : 0.6 }}>
                {!pronto && !erroPdf ? <><FiLoader /> Preparando o PDF...</> : canal === "whatsapp" ? <><FiSend /> Enviar pelo WhatsApp</> : <><FiSend /> Enviar por e-mail</>}
              </button>
              <div style={{ fontSize: 12, color: COR.suave, marginTop: -6, textAlign: "center" }}>
                {canal === "whatsapp" ? "Abre a conversa com a mensagem pronta e baixa o PDF para você anexar (📎)." : "Abre o seu e-mail com a mensagem pronta e baixa o PDF para você anexar."}
              </div>
              {canal === "whatsapp" && compartilhar && (
                <button type="button" disabled={!pronto} onClick={aoCompartilhar} style={{ background: "transparent", border: "none", color: COR.destaque, fontSize: 13, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                  <FiShare2 /> Ou compartilhar com o PDF já anexado
                </button>
              )}
            </>
          )}

          {aviso && (
            <div style={{ fontSize: 13.5, color: aviso.tipo === "ok" ? COR.ok : COR.erro, display: "flex", gap: 6, alignItems: "flex-start" }}>
              {aviso.tipo === "ok" ? <FiCheckCircle style={{ flexShrink: 0, marginTop: 2 }} /> : <FiAlertTriangle style={{ flexShrink: 0, marginTop: 2 }} />} {aviso.texto}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
