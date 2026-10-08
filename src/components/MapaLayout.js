import React, { useEffect, useState } from "react";
import { FiEye, FiX } from "react-icons/fi";

// Layout comum a todos os Mapas Interativos (MMII venoso, MMII arterial,
// carótidas): fundo branco e, ao tocar num vaso, a caixa de preenchimento
// aparece junto do desenho, sem precisar rolar a tela.
// - Tela a partir de 740px (notebook, tablet): desenho à esquerda, caixa à direita.
// - Celular: desenho em cima e a caixa sobe
//   como uma gaveta na parte de baixo da tela.

const LARGURA_LADO_A_LADO = 740;

export const COR = {
  texto: "#1a2530",
  suave: "#5c6b78",
  borda: "#dfe6ec",
  fundoSuave: "#f7f9fa",
  destaque: "#0eb8d0",
  destaqueEscuro: "#0a7f91",
};

function useTelaLarga() {
  const calc = () => (typeof window === "undefined" ? true : window.innerWidth >= LARGURA_LADO_A_LADO);
  const [larga, setLarga] = useState(calc);
  useEffect(() => {
    const onResize = () => setLarga(calc());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return larga;
}

export function botaoMapaStyle(background, compacto) {
  return {
    padding: compacto ? "8px 10px" : "9px 16px",
    borderRadius: 8,
    border: "none",
    background,
    color: "#fff",
    cursor: "pointer",
    fontWeight: 700,
    fontSize: compacto ? 12.5 : 13,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    flex: compacto ? "1 1 40%" : "0 0 auto",
  };
}

// Os campos dos formulários (CamposArteria etc.) usam rótulos ciano pensados
// para o fundo escuro da página; dentro do mapa (fundo branco) escurecemos.
const CSS_TEMA_CLARO = `
.mapa-claro label, .mapa-claro span { color: inherit; }
.mapa-claro [style*="color: rgb(14, 184, 208)"] { color: ${COR.destaqueEscuro} !important; }
.mapa-claro select, .mapa-claro input[type="number"], .mapa-claro input[type="text"], .mapa-claro textarea {
  max-width: 100%; box-sizing: border-box; font-size: 14px;
}
`;

export function PreviewImagemPdf({ titulo, onFechar, children }) {
  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(8,14,22,0.82)", zIndex: 2200, display: "flex", alignItems: "flex-start", justifyContent: "center", overflowY: "auto", padding: "clamp(8px,3vw,32px)" }}
      onClick={onFechar}
    >
      <div
        style={{ width: "100%", maxWidth: 900, background: "#fff", borderRadius: 14, padding: 16, color: COR.texto, boxShadow: "0 24px 60px rgba(0,0,0,0.5)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 10 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>{titulo}</div>
            <div style={{ fontSize: 12, color: COR.suave }}>É esta imagem que vai para o PDF.</div>
          </div>
          <button onClick={onFechar} style={botaoMapaStyle("#c0392b")}>Fechar</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function MapaLayout({
  titulo,
  subtitulo = "Toque num vaso do desenho para preencher. O laudo é atualizado em tempo real.",
  onFechar,
  lado, ladoAtivo, onTrocarLado,
  desenho,
  legenda,
  painel, tituloPainel, onFecharPainel,
  placeholderPainel = "Toque em um vaso no desenho para registrar o achado.",
  conteudo,
  incluirPdf, onIncluirPdf, labelIncluirPdf = "Incluir Mapeamento no PDF",
  onVisualizarImagem,
  onSalvarTXT, onSalvarPDF, onSalvarExame,
}) {
  const larga = useTelaLarga();

  // Esc fecha a caixa (ou o mapa, se não houver caixa aberta).
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      if (painel && onFecharPainel) onFecharPainel();
      else onFechar();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [painel, onFecharPainel, onFechar]);

  const cabecalho = (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap", padding: larga ? "14px 18px 10px" : "10px 12px 8px", borderBottom: `1px solid ${COR.borda}` }}>
      <div style={{ minWidth: 0 }}>
        <h2 style={{ margin: 0, fontSize: "clamp(15px,2.6vw,19px)", color: COR.texto }}>{titulo}</h2>
        <div style={{ fontSize: 12, color: COR.suave, marginTop: 2 }}>{subtitulo}</div>
      </div>
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        {lado === "Ambos" && onTrocarLado && (
          <div style={{ display: "flex", gap: 4 }}>
            {["Direito", "Esquerdo"].map((op) => (
              <button
                key={op}
                onClick={() => onTrocarLado(op)}
                style={{
                  padding: "6px 12px", borderRadius: 6, border: `1px solid ${COR.destaque}`,
                  background: ladoAtivo === op ? COR.destaque : "#fff", color: ladoAtivo === op ? "#fff" : COR.destaqueEscuro,
                  cursor: "pointer", fontWeight: 700, fontSize: 13,
                }}
              >{op}</button>
            ))}
          </div>
        )}
        <button onClick={onFechar} style={botaoMapaStyle("#c0392b")}>Fechar</button>
      </div>
    </div>
  );

  const caixaVazia = (
    <div style={{ padding: "12px 14px", background: COR.fundoSuave, border: `1px dashed ${COR.borda}`, borderRadius: 10, fontSize: 13, color: COR.suave, flexShrink: 0 }}>
      {placeholderPainel}
    </div>
  );

  const caixaPainel = painel && (
    <div style={{ border: `2px solid ${COR.destaque}`, borderRadius: 12, background: "#fff", overflow: "hidden", flexShrink: 0 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "8px 12px", background: "#e8f8fb", borderBottom: `1px solid ${COR.borda}` }}>
        <strong style={{ fontSize: 14, color: COR.texto }}>{tituloPainel}</strong>
        {onFecharPainel && (
          <button onClick={onFecharPainel} aria-label="Fechar caixa" style={{ border: "none", background: "transparent", cursor: "pointer", color: COR.suave, fontSize: 18, display: "inline-flex" }}><FiX /></button>
        )}
      </div>
      <div className="mapa-claro" style={{ padding: 12 }}>{painel}</div>
    </div>
  );

  const rodape = (
    <div style={{ borderTop: `1px solid ${COR.borda}`, padding: larga ? "10px 18px" : "8px 10px", background: "#fff", display: "flex", flexDirection: larga ? "row" : "column", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
      {onIncluirPdf ? (
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: COR.texto, cursor: "pointer" }}>
          <input type="checkbox" checked={!!incluirPdf} onChange={(e) => onIncluirPdf(e.target.checked)} />
          {labelIncluirPdf}
        </label>
      ) : <span />}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "center", width: larga ? "auto" : "100%" }}>
        {onVisualizarImagem && (
          <button onClick={onVisualizarImagem} style={botaoMapaStyle("#6f42c1", !larga)}><FiEye /> Visualizar imagem do PDF</button>
        )}
        <button onClick={onSalvarTXT} style={botaoMapaStyle(COR.destaque, !larga)}>Salvar TXT</button>
        <button onClick={onSalvarPDF} style={botaoMapaStyle(COR.destaque, !larga)}>Salvar PDF</button>
        <button onClick={onSalvarExame} style={botaoMapaStyle("#28a745", !larga)}>Salvar Exame</button>
      </div>
    </div>
  );

  const blocoDesenho = (
    <>
      <div style={{ display: "flex", justifyContent: "center", border: `1px solid ${COR.borda}`, borderRadius: 10, background: "#fbfbfb", padding: 4 }}>
        {desenho}
      </div>
      {legenda && <div style={{ marginTop: 8 }}>{legenda}</div>}
    </>
  );

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(8,14,22,0.6)", zIndex: 2000, display: "flex", justifyContent: "center", alignItems: "stretch", padding: larga ? "clamp(8px,2vh,20px)" : 0 }}>
      <style>{CSS_TEMA_CLARO}</style>
      <div style={{
        background: "#fff", color: COR.texto, width: "100%", maxWidth: larga ? 1320 : "none",
        borderRadius: larga ? 14 : 0, boxShadow: "0 8px 40px rgba(0,0,0,0.4)",
        display: "flex", flexDirection: "column", overflow: "hidden", minHeight: 0,
      }}>
        {cabecalho}

        {larga ? (
          <div style={{ flex: 1, minHeight: 0, display: "grid", gridTemplateColumns: "minmax(300px, 1fr) minmax(340px, 1fr)", gap: 0 }}>
            <div style={{ overflowY: "auto", padding: 14, borderRight: `1px solid ${COR.borda}` }}>
              {blocoDesenho}
            </div>
            <div style={{ overflowY: "auto", padding: 14, display: "flex", flexDirection: "column", gap: 12 }}>
              {caixaPainel || caixaVazia}
              <div style={{ display: "flex", flexDirection: "column", gap: 12, flexShrink: 0 }}>{conteudo}</div>
            </div>
          </div>
        ) : (
          <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: 10, paddingBottom: painel ? "52vh" : 10, display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ flexShrink: 0 }}>{blocoDesenho}</div>
            {!painel && caixaVazia}
            <div style={{ display: "flex", flexDirection: "column", gap: 12, flexShrink: 0 }}>{conteudo}</div>
          </div>
        )}

        {(larga || !painel) && rodape}
      </div>

      {/* Celular / tablet em pé: a caixa do vaso sobe como gaveta, por cima da parte de baixo */}
      {!larga && painel && (
        <div style={{
          position: "fixed", left: 0, right: 0, bottom: 0, maxHeight: "50vh", zIndex: 2010,
          background: "#fff", color: COR.texto, borderTopLeftRadius: 16, borderTopRightRadius: 16,
          boxShadow: "0 -8px 30px rgba(0,0,0,0.25)", display: "flex", flexDirection: "column",
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "10px 14px", borderBottom: `1px solid ${COR.borda}`, background: "#e8f8fb", borderTopLeftRadius: 16, borderTopRightRadius: 16 }}>
            <strong style={{ fontSize: 14 }}>{tituloPainel}</strong>
            <button onClick={onFecharPainel} style={botaoMapaStyle(COR.destaque)}>Concluir</button>
          </div>
          <div className="mapa-claro" style={{ overflowY: "auto", padding: 12 }}>{painel}</div>
        </div>
      )}
    </div>
  );
}
