import React, { useMemo, useState } from "react";
import jsPDF from "jspdf";
import { renderToStaticMarkup } from "react-dom/server";
import {
  CORES,
  gerarConclusaoVisual,
  conclusoesSistemaProfundo,
} from "../utils/vascularMapping";
import { DesenhoMMIIVenoso, VIEW_W, VIEW_H, VARIZ_CORES, VARIZ_ICON_RX, VARIZ_ICON_RY_TIPO, VarizLegendaIcone } from "./MapaInterativo";

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
// Desenha no PDF (vetorial) o mesmo ícone de variz do VarizIcon, centrado em
// (cx, cy) em mm; k converte as coordenadas do desenho (px) para mm.
function desenharIconeVarizPdf(doc, tipo, cx, cy, k) {
  const rgb = hexParaRgb(VARIZ_CORES[tipo]);
  const P = (x, y) => [cx + x * k, cy + y * k];
  doc.setDrawColor(rgb.r, rgb.g, rgb.b);
  doc.setFillColor(255, 255, 255);
  doc.setLineWidth(1.4 * k);
  doc.ellipse(cx, cy, VARIZ_ICON_RX * k, VARIZ_ICON_RY_TIPO * k, "FD");
  doc.setLineCap("round");
  if (tipo === "Varizes Superficiais") {
    // Curvas quadráticas do squiggle convertidas em cúbicas (relativas), que é o que o jsPDF desenha.
    const cubica = (p0, c, p2) => [
      (2 / 3) * (c[0] - p0[0]), (2 / 3) * (c[1] - p0[1]),
      p2[0] - p0[0] + (2 / 3) * (c[0] - p2[0]), p2[1] - p0[1] + (2 / 3) * (c[1] - p2[1]),
      p2[0] - p0[0], p2[1] - p0[1],
    ];
    const a = [-6.5, 3.9], b = [0, -1.3], c = [6.5, -3.9];
    doc.setLineWidth(2.4 * k);
    doc.lines([cubica(a, [-3.25, -5.2], b), cubica(b, [3.25, 3.9], c)], ...P(a[0], a[1]), [k, k], "S", false);
  } else if (tipo === "Varizes Reticulares") {
    doc.setLineWidth(1.2 * k);
    [[-6.5, -3.9, 6.5, -3.9], [-6.5, 3.9, 6.5, 3.9], [-3.9, -6.5, -3.9, 6.5], [3.9, -6.5, 3.9, 6.5]]
      .forEach(([x1, y1, x2, y2]) => doc.line(...P(x1, y1), ...P(x2, y2)));
  } else {
    doc.setLineWidth(1.5 * k);
    [[-5.2, -2.6, 3.25, 1.95], [1.95, -5.2, 1.3, 3.9], [-1.3, 1.3, 3.9, 2.6], [2.6, 2.6, 2.6, -1.3]]
      .forEach(([x, y, dx, dy]) => doc.line(...P(x, y), ...P(x + dx, y + dy)));
  }
  doc.setLineCap("butt");
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
  ];
  const escalaIcone = 0.16;
  const larguraIcone = 2 * VARIZ_ICON_RX * escalaIcone;
  const larguraVarizes = legendaVarizes.reduce((acc, [label]) => acc + larguraIcone + 2 + doc.getTextWidth(label) + 8, -8);
  let lx3 = (pageWidth - larguraVarizes) / 2;
  legendaVarizes.forEach(([label, tipo]) => {
    desenharIconeVarizPdf(doc, tipo, lx3 + larguraIcone / 2, y - 1.3, escalaIcone);
    const rgb = hexParaRgb(VARIZ_CORES[tipo]);
    doc.setTextColor(rgb.r, rgb.g, rgb.b);
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

function svgParaImagemDataUrl(svgString, largura, altura) {
  return new Promise((resolve, reject) => {
    const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      const escala = 2; // suficiente para nitidez em A4, sem inflar o arquivo
      const canvas = document.createElement("canvas");
      canvas.width = largura * escala;
      canvas.height = altura * escala;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      // JPEG reduz bastante o tamanho do PDF; sem transparência no desenho, não perde qualidade visível
      resolve(canvas.toDataURL("image/jpeg", 0.88));
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
    img.src = url;
  });
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

    doc.addPage();
    let y = 16;
    doc.setFontSize(13);
    doc.setFont(undefined, "bold");
    doc.text(`Mapeamento Venoso — Membro Inferior ${ladoAtual}`, pageWidth / 2, y, { align: "center" });
    y += 8;
    doc.setFont(undefined, "normal");

    const imgWidthMm = 170;
    const imgHeightMm = imgWidthMm * (VIEW_H / VIEW_W);
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
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h2 style={{ margin: 0, fontSize: "clamp(16px, 3vw, 20px)", color: "#1c3d5a" }}>Mapeamento Venoso</h2>
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
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: VARIZ_CORES["Varizes Superficiais"] }}><VarizLegendaIcone tipo="Varizes Superficiais" /> varizes superficiais</span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: VARIZ_CORES["Varizes Reticulares"] }}><VarizLegendaIcone tipo="Varizes Reticulares" /> reticulares</span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: VARIZ_CORES["Microvarizes"] }}><VarizLegendaIcone tipo="Microvarizes" /> microvarizes</span>
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
            <div
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
