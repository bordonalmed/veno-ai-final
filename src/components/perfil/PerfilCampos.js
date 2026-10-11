import React, { useEffect, useRef, useState } from "react";
import { FiUpload, FiTrash2, FiEdit3, FiImage, FiRotateCcw, FiCheck } from "react-icons/fi";
import { prepararImagem } from "../../utils/imagemPerfil";

// Peças da personalização do laudo, usadas em Configurações e no assistente
// de primeiro acesso: campos, envio de imagem (com redução automática),
// assinatura desenhada na tela e a prévia do laudo.

export const TEMA = {
  fundoCard: "#1a2332",
  fundoCampo: "#f7fbff",
  borda: "#2c3a52",
  destaque: "#0eb8d0",
  texto: "#e8eef4",
  suave: "#8fa1b5",
  erro: "#ff7c7c",
  ok: "#3ddc97",
};

export const ESPECIALIDADES = [
  "Angiologia e Cirurgia Vascular",
  "Cirurgia Vascular",
  "Angiologia",
  "Radiologia e Diagnóstico por Imagem",
  "Ecografia Vascular com Doppler",
  "Cardiologia",
  "Medicina Interna",
];

export function Card({ titulo, icone, descricao, children, acao }) {
  return (
    <section style={{ background: TEMA.fundoCard, border: `1px solid ${TEMA.borda}`, borderRadius: 12, padding: "clamp(14px, 2.5vw, 20px)" }}>
      {(titulo || acao) && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: descricao ? 4 : 14 }}>
          <h3 style={{ margin: 0, fontSize: 16, color: TEMA.texto, display: "inline-flex", alignItems: "center", gap: 8 }}>
            {icone && <span style={{ color: TEMA.destaque, display: "inline-flex" }}>{icone}</span>}{titulo}
          </h3>
          {acao}
        </div>
      )}
      {descricao && <p style={{ margin: "0 0 14px", fontSize: 13, color: TEMA.suave, lineHeight: 1.45 }}>{descricao}</p>}
      {children}
    </section>
  );
}

export function CampoTexto({ label, value, onChange, placeholder, type = "text", lista, readOnly, dica, autoFocus }) {
  const id = useRef(`c${Math.random().toString(36).slice(2)}`).current;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5, minWidth: 0 }}>
      <label htmlFor={id} style={{ fontSize: 12.5, fontWeight: 600, color: TEMA.suave }}>{label}</label>
      <input
        id={id}
        type={type}
        value={value || ""}
        onChange={(e) => onChange && onChange(e.target.value)}
        placeholder={placeholder}
        list={lista ? `${id}-lista` : undefined}
        readOnly={readOnly}
        autoFocus={autoFocus}
        style={{
          padding: "10px 12px", borderRadius: 8, fontSize: 14, border: `1.5px solid ${readOnly ? "#3a475e" : "#2f6f86"}`,
          background: readOnly ? "#253046" : TEMA.fundoCampo, color: readOnly ? TEMA.suave : "#16202c", outline: "none", width: "100%", boxSizing: "border-box",
        }}
      />
      {lista && <datalist id={`${id}-lista`}>{lista.map((o) => <option key={o} value={o} />)}</datalist>}
      {dica && <span style={{ fontSize: 11.5, color: TEMA.suave }}>{dica}</span>}
    </div>
  );
}

export const grade2 = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 };

export function botao(cor = TEMA.destaque, contorno = false) {
  return {
    background: contorno ? "transparent" : cor, color: contorno ? cor : "#fff", border: `1.5px solid ${cor}`,
    borderRadius: 8, padding: "9px 14px", fontWeight: 600, fontSize: 13.5, cursor: "pointer",
    display: "inline-flex", alignItems: "center", gap: 6, justifyContent: "center",
  };
}

// Envio de logo/assinatura: arrastar e soltar ou clicar; a imagem é cortada
// e reduzida antes de guardar.
export function UploadImagem({ valor, onChange, rotulo, maxW, maxH, alturaPrevia = 90, extra }) {
  const [arrastando, setArrastando] = useState(false);
  const [erro, setErro] = useState("");
  const [processando, setProcessando] = useState(false);
  const inputRef = useRef(null);

  async function receber(arquivo) {
    setErro("");
    if (!arquivo) return;
    if (!/^image\/(png|jpe?g|gif|webp)$/i.test(arquivo.type)) { setErro("Use uma imagem PNG, JPG, GIF ou WEBP."); return; }
    if (arquivo.size > 10 * 1024 * 1024) { setErro("Imagem acima de 10 MB."); return; }
    setProcessando(true);
    try {
      onChange(await prepararImagem(arquivo, { maxW, maxH }));
    } catch (e) {
      setErro(e.message || "Não foi possível usar esta imagem.");
    } finally {
      setProcessando(false);
    }
  }

  return (
    <div>
      <div
        onDragOver={(e) => { e.preventDefault(); setArrastando(true); }}
        onDragLeave={() => setArrastando(false)}
        onDrop={(e) => { e.preventDefault(); setArrastando(false); receber(e.dataTransfer.files?.[0]); }}
        onClick={() => !valor && inputRef.current?.click()}
        style={{
          border: `2px dashed ${arrastando ? TEMA.destaque : "#3a4a66"}`, borderRadius: 10, padding: 14, minHeight: alturaPrevia + 28,
          display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 10,
          background: arrastando ? "rgba(14,184,208,0.08)" : "#141c2a", cursor: valor ? "default" : "pointer",
        }}
      >
        {valor ? (
          <div style={{ background: "#fff", borderRadius: 6, padding: 8, display: "flex", alignItems: "center", justifyContent: "center", maxWidth: "100%" }}>
            <img src={valor} alt={rotulo} style={{ maxHeight: alturaPrevia, maxWidth: "100%", objectFit: "contain", display: "block" }} />
          </div>
        ) : (
          <>
            <FiImage size={26} color={TEMA.suave} />
            <span style={{ fontSize: 13, color: TEMA.suave, textAlign: "center" }}>
              {processando ? "Preparando imagem..." : <>Arraste a imagem aqui ou <b style={{ color: TEMA.destaque }}>clique para escolher</b></>}
            </span>
          </>
        )}
      </div>
      <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/gif,image/webp" style={{ display: "none" }}
        onChange={(e) => { receber(e.target.files?.[0]); e.target.value = ""; }} />
      <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
        {valor && <button type="button" style={botao(TEMA.destaque, true)} onClick={() => inputRef.current?.click()}><FiUpload /> Trocar</button>}
        {valor && <button type="button" style={botao(TEMA.erro, true)} onClick={() => onChange("")}><FiTrash2 /> Remover</button>}
        {extra}
      </div>
      {erro && <div style={{ color: TEMA.erro, fontSize: 12.5, marginTop: 6 }}>{erro}</div>}
    </div>
  );
}

// Assinatura feita com o dedo (celular/tablet) ou com o mouse.
export function AssinaturaDesenho({ onConcluir, onCancelar }) {
  const canvasRef = useRef(null);
  const desenhando = useRef(false);
  const [vazio, setVazio] = useState(true);

  useEffect(() => {
    const c = canvasRef.current;
    const razao = window.devicePixelRatio || 1;
    c.width = c.offsetWidth * razao;
    c.height = c.offsetHeight * razao;
    const ctx = c.getContext("2d");
    ctx.scale(razao, razao);
    ctx.lineWidth = 2.4;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#13233f";
  }, []);

  const ponto = (e) => {
    const r = canvasRef.current.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top];
  };
  const inicio = (e) => {
    e.preventDefault();
    canvasRef.current.setPointerCapture?.(e.pointerId);
    desenhando.current = true;
    const ctx = canvasRef.current.getContext("2d");
    const [x, y] = ponto(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };
  const mover = (e) => {
    if (!desenhando.current) return;
    const ctx = canvasRef.current.getContext("2d");
    const [x, y] = ponto(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    setVazio(false);
  };
  const fim = () => { desenhando.current = false; };
  const limpar = () => {
    const c = canvasRef.current;
    c.getContext("2d").clearRect(0, 0, c.width, c.height);
    setVazio(true);
  };

  return (
    <div>
      <div style={{ position: "relative", background: "#fff", borderRadius: 10, border: `2px solid ${TEMA.destaque}` }}>
        <canvas
          ref={canvasRef}
          onPointerDown={inicio} onPointerMove={mover} onPointerUp={fim} onPointerLeave={fim}
          style={{ width: "100%", height: 170, display: "block", touchAction: "none", cursor: "crosshair" }}
        />
        <div style={{ position: "absolute", left: 20, right: 20, bottom: 34, borderBottom: "1px dashed #b8c4d0", pointerEvents: "none" }} />
        {vazio && <span style={{ position: "absolute", left: 0, right: 0, top: 70, textAlign: "center", color: "#9aa7b4", fontSize: 13, pointerEvents: "none" }}>Assine aqui com o dedo ou o mouse</span>}
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
        <button type="button" style={botao(TEMA.ok)} disabled={vazio}
          onClick={async () => onConcluir(await prepararImagem(canvasRef.current.toDataURL("image/png"), { maxW: 600, maxH: 200 }))}>
          <FiCheck /> Usar esta assinatura
        </button>
        <button type="button" style={botao(TEMA.suave, true)} onClick={limpar}><FiRotateCcw /> Limpar</button>
        {onCancelar && <button type="button" style={botao(TEMA.suave, true)} onClick={onCancelar}>Cancelar</button>}
      </div>
    </div>
  );
}

// Assinatura: enviar imagem ou desenhar.
export function CampoAssinatura({ valor, onChange }) {
  const [desenhar, setDesenhar] = useState(false);
  if (desenhar) {
    return <AssinaturaDesenho onConcluir={(d) => { onChange(d); setDesenhar(false); }} onCancelar={() => setDesenhar(false)} />;
  }
  return (
    <UploadImagem valor={valor} onChange={onChange} rotulo="Assinatura" maxW={600} maxH={200} alturaPrevia={70}
      extra={<button type="button" style={botao(TEMA.destaque, true)} onClick={() => setDesenhar(true)}><FiEdit3 /> Desenhar na tela</button>} />
  );
}

// Miniatura de uma página do laudo, com as mesmas posições do PDF
// (logo à esquerda, clínica à direita, assinatura e dados do médico no rodapé).
export function PreviaLaudo({ perfil, largura = 300 }) {
  const k = largura / 210; // px por mm
  const p = perfil || {};
  const clinica = [p.nomeClinica, p.enderecoClinica, p.telefoneClinica && `Tel: ${p.telefoneClinica}`, p.emailClinica].filter(Boolean);
  const pt = (n) => n * 0.3528 * k; // pontos -> px
  const barra = (w, cor = "#e3e8ee") => <div style={{ height: pt(7), width: `${w}%`, background: cor, borderRadius: 2, marginBottom: pt(6) }} />;
  return (
    <div style={{ width: largura, height: largura * (297 / 210), background: "#fff", borderRadius: 4, boxShadow: "0 6px 24px rgba(0,0,0,0.35)", position: "relative", overflow: "hidden", color: "#111", fontFamily: "Helvetica, Arial, sans-serif" }}>
      {/* cabeçalho */}
      <div style={{ position: "absolute", left: 15 * k, top: 14 * k, right: 10 * k, display: "flex", justifyContent: "space-between", gap: 8 * k }}>
        <div style={{ width: 50 * k, height: 20 * k, display: "flex", alignItems: "flex-start" }}>
          {p.logoClinica
            ? <img src={p.logoClinica} alt="logo" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
            : <div style={{ width: "100%", height: "100%", border: "1px dashed #c9d2dc", borderRadius: 3, display: "flex", alignItems: "center", justifyContent: "center", color: "#aab4bf", fontSize: pt(8) }}>seu logo</div>}
        </div>
        <div style={{ textAlign: "right", fontWeight: 700, fontSize: pt(9), lineHeight: 1.35, minWidth: 0, overflowWrap: "anywhere" }}>
          {clinica.length ? clinica.map((t, i) => <div key={i}>{t}</div>) : <div style={{ color: "#b0b9c3" }}>Dados da clínica</div>}
        </div>
      </div>
      {/* corpo (ilustrativo) */}
      <div style={{ position: "absolute", left: 15 * k, right: 15 * k, top: 46 * k }}>
        <div style={{ fontWeight: 700, fontSize: pt(11), marginBottom: pt(4) }}>PACIENTE: Nome do paciente</div>
        <div style={{ fontSize: pt(11), marginBottom: pt(10) }}>DATA: 10/10/2026</div>
        <div style={{ fontWeight: 700, fontSize: pt(11), marginBottom: pt(8) }}>DOPPLER VENOSO DE MEMBRO INFERIOR</div>
        {barra(92)}{barra(85)}{barra(88)}{barra(70)}{barra(90)}{barra(60)}
        <div style={{ fontWeight: 700, fontSize: pt(11), margin: `${pt(10)}px 0 ${pt(6)}px` }}>CONCLUSÃO</div>
        {barra(80, "#cfd7e0")}{barra(55, "#cfd7e0")}
      </div>
      {/* rodapé */}
      <div style={{ position: "absolute", right: 10 * k, top: 262 * k, width: 60 * k, textAlign: "right", fontSize: pt(8), lineHeight: 1.3 }}>
        <div style={{ height: 15 * k, display: "flex", justifyContent: "flex-end", alignItems: "flex-end", marginBottom: 2 * k }}>
          {p.assinaturaMedico && <img src={p.assinaturaMedico} alt="assinatura" style={{ maxWidth: 50 * k, maxHeight: "100%", objectFit: "contain" }} />}
        </div>
        <div>Assinatura: ____________</div>
        <div style={{ fontWeight: 700 }}>{p.nomeMedico || <span style={{ color: "#b0b9c3" }}>Nome do médico</span>}</div>
        {p.crm ? <div>CRM: {p.crm}</div> : <div style={{ color: "#b0b9c3" }}>CRM</div>}
        {p.especialidade && <div>{p.especialidade}</div>}
      </div>
      <div style={{ position: "absolute", left: 15 * k, bottom: 6 * k, fontSize: pt(6.5), color: "#8a96a3" }}>Laudo gerado com VENO.AI · www.venoai.xyz</div>
    </div>
  );
}
