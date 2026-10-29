import React, { useMemo, useState } from "react";
import jsPDF from "jspdf";
import { carimbarMarcaVenoAI } from "../utils/pdfMarca";
import { renderToStaticMarkup } from "react-dom/server";
import { svgParaImagemDataUrl } from "../utils/svgParaImagem";
import {
  CORES,
  gerarConclusaoVisual,
  conclusoesSistemaProfundo,
} from "../utils/vascularMapping";
import { DesenhoMMIIVenoso, VIEW_W, VIEW_H, VARIZ_COR, VARIZ_CORES, TRACO_LARGURA, VarizLinhaLegenda } from "./MapaInterativo";
import { novaPaginaComCabecalho, caberNaFaixa } from "../utils/pdfCabecalho";

// Monta o desenho (vista anterior + posterior) de UM membro com o mesmo
// componente do Mapa Interativo, pra o Mapeamento Visual e o PDF saírem
// iguais ao que o usuário vê/marca no Mapa Interativo.
function montarSvgLado({ ladoAtual, superficiais, magna, parva, perfurantes, profundas, varizes }) {
  const s = superficiais?.[ladoAtual] || {};
  const magnaExtra = magna?.[ladoAtual] || {};
  const parvaExtra = parva?.[ladoAtual] || {};
  const perfs = perfurantes?.[ladoAtual];
  const prof = profundas?.[ladoAtual];

  const svg = renderToStaticMarkup(
    <DesenhoMMIIVenoso
      lado={ladoAtual}
      profundas={prof}
      superficiais={s}
      magna={magnaExtra}
      parva={parvaExtra}
      perfurantes={perfs}
      varizes={varizes?.[ladoAtual]}
      width={VIEW_W}
      height={VIEW_H}
    />
  );

  const perfurantesInsuficientes = (Array.isArray(perfs) ? perfs : [])
    .filter((perf) => perf && perf.status === "pérvia e incompetente" && perf.segmento);
  const conclusoes = [...conclusoesSistemaProfundo(prof)];
  const cMagna = gerarConclusaoVisual("magna", "JSF", s["Safena Magna"], magnaExtra.inicio, magnaExtra.fim, magnaExtra.inicio_valor, magnaExtra.fim_valor);
  const cParva = gerarConclusaoVisual("parva", "JSP", s["Safena Parva"], parvaExtra.inicio, parvaExtra.fim, parvaExtra.inicio_valor, parvaExtra.fim_valor);
  if (cMagna) conclusoes.push(cMagna);
  if (cParva) conclusoes.push(cParva);
  perfurantesInsuficientes.forEach((perf) => {
    conclusoes.push(
      `Insuficiência de veia perfurante${perf.segmento ? ` (${perf.valor ? perf.valor + " " : ""}${perf.segmento})` : ""}`
    );
  });

  return { svg, conclusoes };
}

// Desenha a legenda de cores e símbolos usada nos PDFs do esquema de
// mapeamento (compartilhada entre o PDF isolado "Baixar PDF (A4)" e o PDF
// anexado ao laudo principal via "Incluir Mapeamento Visual no PDF"), para
// que quem receber o exame impresso saiba o que cada cor/símbolo significa.
// Desenha no PDF (vetorial) a amostra do traço de variz — vermelho, com o
// calibre do tipo —, começando em (x, y) em mm; k converte px do desenho em mm.
function desenharLinhaVarizPdf(doc, tipo, x, y, k) {
  const rgb = hexParaRgb(VARIZ_CORES[tipo] || VARIZ_COR);
  doc.setDrawColor(rgb.r, rgb.g, rgb.b);
  doc.setLineWidth(TRACO_LARGURA[tipo] * k);
  doc.setLineCap("round");
  doc.setLineJoin("round");
  doc.lines([[2, -1.6], [2, 1.6], [2, -1.6]], x, y + 0.8, [1, 1], "S", false);
  doc.setLineCap("butt");
  doc.setLineJoin("miter");
  doc.setLineWidth(0.2);
  doc.setDrawColor(0, 0, 0);
}

function desenharLegendaPdf(doc, pageWidth, yInicial) {
  let y = yInicial;
  doc.setFontSize(8.5);
  const legendaCores = [
    ["Veia suficiente", CORES["pérvia e competente"]],
    ["Veia insuficiente", CORES["pérvia e incompetente"]],
    ["Trombose", CORES["não compressível e sem fluxo (trombose)"]],
    ["Recanalização parcial", CORES["recanalização parcial"]],
    ["Veia ausente", CORES["ausente"]],
  ];
  let lx = (pageWidth - 150) / 2;
  legendaCores.forEach(([label, cor]) => {
    const rgb = hexParaRgb(cor);
    doc.setFillColor(rgb.r, rgb.g, rgb.b);
    doc.rect(lx, y - 2.6, 4, 2, "F");
    doc.setTextColor(90, 100, 110);
    doc.text(label, lx + 6, y);
    lx += 6 + doc.getTextWidth(label) + 8;
  });
  doc.setTextColor(0, 0, 0);
  y += 6;

  const rgbPerf = hexParaRgb(CORES["pérvia e incompetente"]);
  doc.setFillColor(rgbPerf.r, rgbPerf.g, rgbPerf.b);
  const rotuloTriangulo = "Perfurante insuficiente";
  const larguraLinha2 = 6 + doc.getTextWidth(rotuloTriangulo);
  const lx2 = (pageWidth - larguraLinha2) / 2;
  doc.triangle(lx2 + 2, y - 4.6, lx2, y - 1, lx2 + 4, y - 1, "F");
  doc.setTextColor(90, 100, 110);
  doc.text(rotuloTriangulo, lx2 + 6, y);
  doc.setTextColor(0, 0, 0);
  y += 5.5;

  // Mesmo ícone que aparece no desenho (não uma bolinha), pra não confundir
  // com as cores de status das veias.
  y += 2;
  doc.setFontSize(8.5);
  const legendaVarizes = [
    ["Varizes superficiais", "Varizes Superficiais"],
    ["Varizes reticulares", "Varizes Reticulares"],
    ["Microvarizes", "Microvarizes"],
    ["Tromboflebite superficial", "Tromboflebite Superficial"],
  ];
  const escalaLinha = 0.16;
  const larguraIcone = 6;
  const larguraVarizes = legendaVarizes.reduce((acc, [label]) => acc + larguraIcone + 2 + doc.getTextWidth(label) + 8, -8);
  let lx3 = (pageWidth - larguraVarizes) / 2;
  legendaVarizes.forEach(([label, tipo]) => {
    desenharLinhaVarizPdf(doc, tipo, lx3, y - 2.1, escalaLinha);
    const rgbVariz = hexParaRgb(VARIZ_CORES[tipo] || VARIZ_COR);
    doc.setTextColor(rgbVariz.r, rgbVariz.g, rgbVariz.b);
    doc.text(label, lx3 + larguraIcone + 2, y);
    lx3 += larguraIcone + 2 + doc.getTextWidth(label) + 8;
  });
  doc.setTextColor(0, 0, 0);
  y += 7;

  let fonteExplicativa = 7.5;
  doc.setFontSize(fonteExplicativa);
  const textoExplicativo =
    "Gc = Gastrocnêmicas   ·   Ta = Tibiais anteriores   ·   So = Soleares   ·   Tp = Tibiais posteriores";
  if (doc.getTextWidth(textoExplicativo) > pageWidth - 20) {
    fonteExplicativa = 6.5;
    doc.setFontSize(fonteExplicativa);
  }
  doc.setTextColor(120, 130, 138);
  doc.text(textoExplicativo, pageWidth / 2, y, { align: "center" });
  doc.setTextColor(0, 0, 0);
  y += 8;

  return y;
}

// Observações do membro (mesmo texto livre digitado no formulário ou no
// Mapa Interativo), impressas no PDF do esquema quando preenchidas.
function desenharObservacoesPdf(doc, pageWidth, yInicial, observacao) {
  if (!observacao || !observacao.trim()) return yInicial;
  let y = yInicial;
  doc.setFontSize(9.5);
  doc.setFont(undefined, "bold");
  doc.text("Observações:", 20, y);
  y += 5;
  doc.setFont(undefined, "normal");
  doc.setFontSize(9);
  const linhas = doc.splitTextToSize(observacao.trim(), pageWidth - 40);
  linhas.forEach((linha) => {
    doc.text(linha, 22, y);
    y += 4.5;
  });
  return y;
}


// Anexa o esquema de mapeamento (uma página A4 por lado) diretamente a um jsPDF
// já existente. Usado tanto pelo modal (Baixar PDF isolado) quanto pelo laudo
// principal (quando o usuário marca "Incluir esquema de mapeamento no PDF").
export async function adicionarEsquemaAoPdf(doc, {
  ladosParaMostrar,
  superficiais,
  magna,
  parva,
  perfurantes,
  profundas,
  varizes,
  observacoes,
}) {
  const pageWidth = doc.internal.pageSize.getWidth();

  for (const ladoAtual of ladosParaMostrar) {
    const { svg } = montarSvgLado({ ladoAtual, superficiais, magna, parva, perfurantes, profundas, varizes });
    const dataUrl = await svgParaImagemDataUrl(svg, VIEW_W, VIEW_H);

    const { topo, base } = novaPaginaComCabecalho(doc);
    let y = topo;
    doc.setFontSize(13);
    doc.setFont(undefined, "bold");
    doc.text(`Mapeamento Venoso — Membro Inferior ${ladoAtual}`, pageWidth / 2, y, { align: "center" });
    y += 8;
    doc.setFont(undefined, "normal");

    // Espaço da legenda e das observações, medido num PDF de rascunho, para
    // o desenho caber entre o cabeçalho e a assinatura.
    const rascunho = new jsPDF({ unit: "mm", format: "a4" });
    const alturaLegenda = desenharLegendaPdf(rascunho, pageWidth, 0);
    const alturaObs = desenharObservacoesPdf(rascunho, pageWidth, 0, observacoes?.[ladoAtual]);
    const { w: imgWidthMm, h: imgHeightMm } = caberNaFaixa(170, 170 * (VIEW_H / VIEW_W), base - y - 6 - alturaLegenda - alturaObs);
    const x = (pageWidth - imgWidthMm) / 2;
    doc.addImage(dataUrl, "JPEG", x, y, imgWidthMm, imgHeightMm);
    y += imgHeightMm + 6;

    // Sem "Achados do mapeamento": a conclusão do laudo, logo antes, já traz a mesma informação.
    y = desenharLegendaPdf(doc, pageWidth, y);

    desenharObservacoesPdf(doc, pageWidth, y, observacoes?.[ladoAtual]);
  }
}

export default function EsquemaMapeamentoModal({
  aberto,
  onFechar,
  lado,
  nome,
  data,
  superficiais,
  magna,
  parva,
  perfurantes,
  profundas,
  varizes,
  observacoes,
}) {
  const [gerandoPdf, setGerandoPdf] = useState(false);

  const ladosParaMostrar = lado === "Ambos" ? ["Direito", "Esquerdo"] : lado ? [lado] : [];

  const esquemas = useMemo(() => {
    const out = {};
    ladosParaMostrar.forEach((ladoAtual) => {
      out[ladoAtual] = montarSvgLado({ ladoAtual, superficiais, magna, parva, perfurantes, profundas, varizes });
    });
    return out;
  }, [lado, superficiais, magna, parva, perfurantes, profundas, varizes]);

  if (!aberto) return null;

  async function handleBaixarPdf() {
    setGerandoPdf(true);
    try {
      const nomeClinica = localStorage.getItem("nomeClinica") || "";
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageWidth = doc.internal.pageSize.getWidth();

      for (let i = 0; i < ladosParaMostrar.length; i++) {
        const ladoAtual = ladosParaMostrar[i];
        if (i > 0) doc.addPage();

        const dataUrl = await svgParaImagemDataUrl(esquemas[ladoAtual].svg, VIEW_W, VIEW_H);

        let y = 16;
        if (nomeClinica) {
          doc.setFontSize(9);
          doc.setFont(undefined, "bold");
          doc.text(nomeClinica, pageWidth / 2, y, { align: "center" });
          y += 6;
        }
        doc.setFontSize(13);
        doc.setFont(undefined, "bold");
        doc.text(`Mapeamento Venoso — Membro Inferior ${ladoAtual}`, pageWidth / 2, y, { align: "center" });
        y += 5;
        doc.setFontSize(9);
        doc.setFont(undefined, "normal");
        doc.text(nome ? `Paciente: ${nome}${data ? "  •  " + data : ""}` : "", pageWidth / 2, y, { align: "center" });
        y += 6;

        const imgWidthMm = 170;
        const imgHeightMm = imgWidthMm * (VIEW_H / VIEW_W);
        const x = (pageWidth - imgWidthMm) / 2;
        doc.addImage(dataUrl, "JPEG", x, y, imgWidthMm, imgHeightMm);
        y += imgHeightMm + 6;

        y = desenharLegendaPdf(doc, pageWidth, y);

        if (esquemas[ladoAtual].conclusoes.length) {
          doc.setFontSize(9.5);
          doc.setFont(undefined, "bold");
          doc.text("Achados:", 20, y);
          y += 5;
          doc.setFont(undefined, "normal");
          esquemas[ladoAtual].conclusoes.forEach((c) => {
            doc.text(`• ${c}`, 22, y);
            y += 5;
          });
          y += 2;
        }

        desenharObservacoesPdf(doc, pageWidth, y, observacoes?.[ladoAtual]);
      }

      const nomeArquivo = `Mapeamento_Venoso_${nome ? nome.replace(/\s+/g, "_") : "exame"}${data ? "_" + data : ""}.pdf`;
      carimbarMarcaVenoAI(doc);
      doc.save(nomeArquivo);
    } catch (e) {
      console.error("Erro ao gerar PDF do esquema de mapeamento:", e);
      alert("Não foi possível gerar o PDF do esquema. Tente novamente.");
    } finally {
      setGerandoPdf(false);
    }
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(8, 14, 22, 0.72)",
        zIndex: 2100, // acima do Mapa Interativo (zIndex 2000) — pode ser aberto por cima dele
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        overflowY: "auto",
        padding: "clamp(16px, 3vw, 40px) 16px",
      }}
      onClick={onFechar}
    >
      <div
        style={{
          background: "#fff",
          color: "#1a2530",
          borderRadius: 14,
          maxWidth: 900,
          width: "100%",
          padding: "clamp(16px, 3vw, 28px)",
          boxShadow: "0 24px 60px rgba(0,0,0,0.4)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <style>{`.esquema-svg-tela svg { width: 100%; height: auto; display: block; }`}</style>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: "clamp(16px, 3vw, 20px)", color: "#1c3d5a" }}>Mapeamento Venoso</h2>
            <div style={{ fontSize: 12, color: "#5c6b78" }}>É esta imagem que vai para o PDF.</div>
          </div>
          <button
            onClick={onFechar}
            style={{
              background: "transparent",
              border: "1px solid #d7dee3",
              borderRadius: 8,
              padding: "6px 12px",
              cursor: "pointer",
              fontSize: 13,
              color: "#5c6b78",
            }}
          >
            Fechar
          </button>
        </div>

        {ladosParaMostrar.length === 0 && (
          <p style={{ color: "#5c6b78", fontSize: 14 }}>
            Selecione o lado (Direito, Esquerdo ou Ambos) no topo do formulário antes de gerar o esquema.
          </p>
        )}

        {ladosParaMostrar.length > 0 && (
          <div
            style={{
              display: "flex",
              gap: 8,
              marginBottom: 10,
              fontSize: 11,
              color: "#5c6b78",
              flexWrap: "wrap",
              justifyContent: "center",
            }}
          >
            <span style={{ color: CORES["pérvia e competente"] }}>● suficiente</span>
            <span style={{ color: CORES["pérvia e incompetente"] }}>● insuficiente</span>
            <span style={{ color: CORES["não compressível e sem fluxo (trombose)"] }}>● trombose</span>
            <span style={{ color: CORES["recanalização parcial"] }}>● recanalização parcial</span>
            <span style={{ color: CORES["ausente"] }}>● ausente</span>
            <span style={{ color: CORES["pérvia e incompetente"] }}>▲ perfurante insuficiente</span>
            <span style={{ marginLeft: 8 }}>Gc=Gastrocnêmicas · Ta=Tibiais Ant. · So=Soleares · Tp=Tibiais Post.</span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: VARIZ_COR }}><VarizLinhaLegenda tipo="Varizes Superficiais" /> varizes superficiais</span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: VARIZ_COR }}><VarizLinhaLegenda tipo="Varizes Reticulares" /> reticulares</span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: VARIZ_COR }}><VarizLinhaLegenda tipo="Microvarizes" /> microvarizes</span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: VARIZ_CORES["Tromboflebite Superficial"] }}><VarizLinhaLegenda tipo="Tromboflebite Superficial" /> tromboflebite superficial</span>
          </div>
        )}

        {ladosParaMostrar.map((ladoAtual) => (
          <div
            key={ladoAtual}
            style={{
              border: "1px solid #d7dee3",
              borderRadius: 10,
              padding: 14,
              marginBottom: 14,
              background: "#f7f8fa",
            }}
          >
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8, color: "#1c3d5a" }}>
              Membro Inferior {ladoAtual}
            </div>
            {/* O SVG sai com largura/altura fixas (as do PDF); na tela ele
                acompanha a largura do modal para caber também no celular. */}
            <div
              className="esquema-svg-tela"
              style={{ width: "100%" }}
              dangerouslySetInnerHTML={{ __html: esquemas[ladoAtual].svg }}
            />
            {esquemas[ladoAtual].conclusoes.length > 0 && (
              <ul style={{ margin: "8px 0 0", paddingLeft: 18, fontSize: 12.5, color: "#1a2530" }}>
                {esquemas[ladoAtual].conclusoes.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            )}
            {observacoes?.[ladoAtual] && observacoes[ladoAtual].trim() && (
              <div style={{ marginTop: 8, fontSize: 12.5, color: "#1a2530" }}>
                <strong>Observações:</strong> {observacoes[ladoAtual]}
              </div>
            )}
          </div>
        ))}

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 8 }}>
          <button
            onClick={handleBaixarPdf}
            disabled={ladosParaMostrar.length === 0 || gerandoPdf}
            style={{
              background: "#0eb8d0",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              padding: "10px 18px",
              fontSize: 13,
              fontWeight: 600,
              cursor: ladosParaMostrar.length === 0 ? "not-allowed" : "pointer",
              opacity: ladosParaMostrar.length === 0 || gerandoPdf ? 0.6 : 1,
            }}
          >
            {gerandoPdf ? "Gerando PDF..." : "Baixar PDF (A4)"}
          </button>
        </div>

        <p style={{ fontSize: 11, color: "#8fa0ad", marginTop: 12, marginBottom: 0 }}>
          Ilustração esquemática original, gerada a partir dos achados preenchidos no formulário. Não substitui a
          descrição textual do laudo.
        </p>
      </div>
    </div>
  );
}

function hexParaRgb(hex) {
  const m = hex.replace("#", "");
  return {
    r: parseInt(m.substring(0, 2), 16),
    g: parseInt(m.substring(2, 4), 16),
    b: parseInt(m.substring(4, 6), 16),
  };
}
