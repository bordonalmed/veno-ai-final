import React, { useMemo, useState } from "react";
import jsPDF from "jspdf";
import {
  MEDIAL_SILHOUETTE,
  FEMORAL_RIBBON,
  POSTERIOR_SILHOUETTE,
  POPLITEA_RIBBON,
  TIBIAIS_RIBBON,
  VSM_SPINE,
  VSM_HALF,
  VSP_SPINE,
  VSP_HALF,
  LANDMARK_MAGNA,
  LANDMARK_PARVA,
  CORES,
  construirSegmentosVeia,
  gerarConclusaoVisual,
  posicaoPerfurante,
  piorCorProfundo,
  conclusoesSistemaProfundo,
  interpAt,
} from "../utils/vascularMapping";

// Texto com "halo" branco (paint-order) para ficar legível sobre a ilustração,
// sem precisar desenhar um retângulo de fundo atrás de cada rótulo.
// Quando a perna está espelhada (Esquerdo), o texto é envolvido num
// contra-espelhamento local (ao redor do próprio ponto x,y) para não sair
// com as letras invertidas, já que ele vive dentro do <g scale(-1,1)> da perna.
function medidaTexto(x, y, texto, align, mirrored) {
  const t = `<text x="${x.toFixed(2)}" y="${y.toFixed(2)}" font-family="monospace" font-size="9.5" text-anchor="${align}" fill="#1a2530" paint-order="stroke" stroke="#ffffff" stroke-width="3">${texto}</text>`;
  if (!mirrored) return t;
  return `<g transform="translate(${(2 * x).toFixed(2)},0) scale(-1,1)">${t}</g>`;
}

// Diâmetro (mm) ao lado da veia, num ponto y aproximado do seu trajeto.
function diametroMarcador(spine, half, y, valorMm, ladoTexto, mirrored) {
  if (!valorMm) return "";
  const [x, , h] = interpAt(spine, half, y);
  const offset = h + 5;
  if (ladoTexto === "esquerda") {
    return medidaTexto(x - offset, y + 3, `Ø ${valorMm}mm`, "end", mirrored);
  }
  return medidaTexto(x + offset, y + 3, `Ø ${valorMm}mm`, "start", mirrored);
}

// Marcadores de início/fim do trecho com refluxo (distância ao longo da veia).
function distanciaMarcadores(spine, half, refluxo, ladoTexto, mirrored) {
  if (!refluxo) return "";
  let svg = "";
  const tick = (y) => {
    const [x, , h] = interpAt(spine, half, y);
    const x1 = ladoTexto === "esquerda" ? x - h : x + h;
    const x2 = ladoTexto === "esquerda" ? x - h - 8 : x + h + 8;
    return `<line x1="${x1.toFixed(2)}" y1="${y.toFixed(2)}" x2="${x2.toFixed(2)}" y2="${y.toFixed(2)}" stroke="#5c6b78" stroke-width="1"/>`;
  };
  if (refluxo.marcarIni) {
    svg += tick(refluxo.yStart);
    const [x, , h] = interpAt(spine, half, refluxo.yStart);
    const offset = h + 10;
    svg += medidaTexto(
      ladoTexto === "esquerda" ? x - offset : x + offset,
      refluxo.yStart + 3,
      refluxo.iniLabel,
      ladoTexto === "esquerda" ? "end" : "start",
      mirrored
    );
  }
  if (refluxo.marcarFim) {
    svg += tick(refluxo.yEnd);
    const [x, , h] = interpAt(spine, half, refluxo.yEnd);
    const offset = h + 10;
    svg += medidaTexto(
      ladoTexto === "esquerda" ? x - offset : x + offset,
      refluxo.yEnd + 3,
      refluxo.fimLabel,
      ladoTexto === "esquerda" ? "end" : "start",
      mirrored
    );
  }
  return svg;
}

// Monta o SVG (vista medial + vista posterior lado a lado) de UM membro.
function montarSvgLado(dadosLado) {
  const { magnaStatus, magnaExtra, parvaStatus, parvaExtra, perfurantes, profundas, mirrored, jsfDiametro, jspDiametro } = dadosLado;
  const perfurantesInsuficientes = (Array.isArray(perfurantes) ? perfurantes : [])
    .filter((perf) => perf && perf.status === "pérvia e incompetente" && perf.segmento);

  const p = profundas || {};
  const corFemoral = piorCorProfundo([
    p["Veia Femoral Comum"],
    p["Veia Femoral Superficial"],
    p["Veia Femoral Profunda"],
  ]);
  const corPoplitea = piorCorProfundo([p["Veia Poplítea"]]);
  const corTibiais = piorCorProfundo([
    p["Veias Tibiais posteriores"],
    p["Veias Tibiais anteriores"],
    p["Veias Gastrocnêmicas"],
    p["Veias Soleares"],
  ]);

  const magnaResult = construirSegmentosVeia({
    spine: VSM_SPINE,
    half: VSM_HALF,
    landmark: LANDMARK_MAGNA,
    status: magnaStatus,
    ini: magnaExtra.inicio,
    fim: magnaExtra.fim,
    iniVal: magnaExtra.inicio_valor,
    fimVal: magnaExtra.fim_valor,
  });
  const parvaResult = construirSegmentosVeia({
    spine: VSP_SPINE,
    half: VSP_HALF,
    landmark: LANDMARK_PARVA,
    status: parvaStatus,
    ini: parvaExtra.inicio,
    fim: parvaExtra.fim,
    iniVal: parvaExtra.inicio_valor,
    fimVal: parvaExtra.fim_valor,
  });

  const magnaSegsSvg = magnaResult.segments
    .map((s) =>
      s.tracejado
        ? `<path d="${s.d}" fill="none" stroke="${s.color}" stroke-width="2" stroke-dasharray="5 5" stroke-linecap="round"/>`
        : `<path d="${s.d}" fill="${s.color}"/>`
    )
    .join("");
  const parvaSegsSvg = parvaResult.segments
    .map((s) =>
      s.tracejado
        ? `<path d="${s.d}" fill="none" stroke="${s.color}" stroke-width="2" stroke-dasharray="5 5" stroke-linecap="round"/>`
        : `<path d="${s.d}" fill="${s.color}"/>`
    )
    .join("");

  const jsfFill = magnaResult.dotColor;
  const jsfStroke = magnaResult.dotStroke || "#ffffff";
  const jspFill = parvaResult.dotColor;
  const jspStroke = parvaResult.dotStroke || "#ffffff";

  const perfMarker = perfurantesInsuficientes
    .map((perf, idx) => {
      const pos = posicaoPerfurante(perf.segmento, perf.valor);
      if (!pos) return "";
      const jitter = idx * 9; // evita sobrepor marcadores quando caem no mesmo ponto
      return `<circle cx="${(pos.x - jitter).toFixed(2)}" cy="${pos.y.toFixed(2)}" r="5.5" fill="${CORES["pérvia e incompetente"]}" stroke="#fff" stroke-width="1.3"/>`;
    })
    .join("");

  const mirrorTransform = mirrored ? "translate(300,0) scale(-1,1)" : "";

  // Medidas (diâmetros e distâncias do refluxo) sobre a vista medial (safena magna)
  const jsfDiamSvg = jsfDiametro
    ? medidaTexto(150 + 15, 48 + 4, `Ø ${jsfDiametro}mm`, "start", mirrored)
    : "";
  const magnaCoxaSvg = diametroMarcador(VSM_SPINE, VSM_HALF, 150, magnaExtra.coxa, "direita", mirrored);
  const magnaPernaSvg = diametroMarcador(VSM_SPINE, VSM_HALF, 420, magnaExtra.perna, "direita", mirrored);
  const magnaTornozeloSvg = diametroMarcador(VSM_SPINE, VSM_HALF, 530, magnaExtra.tornozelo, "direita", mirrored);
  const magnaRefluxoSvg = distanciaMarcadores(VSM_SPINE, VSM_HALF, magnaResult.refluxo, "esquerda", mirrored);

  // Medidas sobre a vista posterior (safena parva)
  const jspDiamSvg = jspDiametro
    ? medidaTexto(150 + 15, 316 + 4, `Ø ${jspDiametro}mm`, "start", mirrored)
    : "";
  const parvaProximalSvg = diametroMarcador(VSP_SPINE, VSP_HALF, 340, parvaExtra.proximal, "direita", mirrored);
  const parvaDistalSvg = diametroMarcador(VSP_SPINE, VSP_HALF, 515, parvaExtra.distal, "direita", mirrored);
  const parvaRefluxoSvg = distanciaMarcadores(VSP_SPINE, VSP_HALF, parvaResult.refluxo, "esquerda", mirrored);

  const medialInner = `
    <path d="${MEDIAL_SILHOUETTE}" fill="url(#skinGradM)" stroke="#a97a4e" stroke-width="1.5"/>
    <path d="${FEMORAL_RIBBON}" fill="${corFemoral}" opacity="0.85"/>
    ${magnaSegsSvg}
    <circle cx="150" cy="48" r="7" fill="${jsfFill}" stroke="${jsfStroke}" stroke-width="1.5"/>
    ${perfMarker}
    ${jsfDiamSvg}${magnaCoxaSvg}${magnaPernaSvg}${magnaTornozeloSvg}${magnaRefluxoSvg}
  `;
  const posteriorInner = `
    <path d="${POSTERIOR_SILHOUETTE}" fill="url(#skinGradP)" stroke="#a97a4e" stroke-width="1.5"/>
    <path d="${POPLITEA_RIBBON}" fill="${corPoplitea}" opacity="0.85"/>
    <path d="${TIBIAIS_RIBBON}" fill="${corTibiais}" opacity="0.85"/>
    ${parvaSegsSvg}
    <circle cx="150" cy="316" r="7" fill="${jspFill}" stroke="${jspStroke}" stroke-width="1.5"/>
    ${jspDiamSvg}${parvaProximalSvg}${parvaDistalSvg}${parvaRefluxoSvg}
  `;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 680" width="640" height="680">
    <defs>
      <radialGradient id="skinGradM" cx="${mirrored ? 65 : 35}%" cy="30%" r="80%">
        <stop offset="0%" stop-color="#f0c9a0"/><stop offset="100%" stop-color="#d9a877"/>
      </radialGradient>
      <radialGradient id="skinGradP" cx="50%" cy="25%" r="85%">
        <stop offset="0%" stop-color="#f0c9a0"/><stop offset="100%" stop-color="#d9a877"/>
      </radialGradient>
    </defs>
    <g transform="translate(0,10)"><g transform="${mirrorTransform}">${medialInner}</g></g>
    <g transform="translate(330,10)"><g transform="${mirrorTransform}">${posteriorInner}</g></g>
    <text x="150" y="660" font-family="monospace" font-size="13" text-anchor="middle" fill="#5c6b78">VISTA MEDIAL</text>
    <text x="480" y="660" font-family="monospace" font-size="13" text-anchor="middle" fill="#5c6b78">VISTA POSTERIOR</text>
  </svg>`;

  const conclusoes = [...conclusoesSistemaProfundo(profundas)];
  const cMagna = gerarConclusaoVisual("magna", "JSF", magnaStatus, magnaExtra.inicio, magnaExtra.fim, magnaExtra.inicio_valor, magnaExtra.fim_valor);
  const cParva = gerarConclusaoVisual("parva", "JSP", parvaStatus, parvaExtra.inicio, parvaExtra.fim, parvaExtra.inicio_valor, parvaExtra.fim_valor);
  if (cMagna) conclusoes.push(cMagna);
  if (cParva) conclusoes.push(cParva);
  perfurantesInsuficientes.forEach((perf) => {
    conclusoes.push(
      `Insuficiência de veia perfurante${perf.segmento ? ` (${perf.valor ? perf.valor + " " : ""}${perf.segmento})` : ""}`
    );
  });

  return { svg, conclusoes };
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
  jsfDiametro,
  jspDiametro,
}) {
  const pageWidth = doc.internal.pageSize.getWidth();

  for (const ladoAtual of ladosParaMostrar) {
    const { svg, conclusoes } = montarSvgLado({
      magnaStatus: superficiais?.[ladoAtual]?.["Safena Magna"],
      magnaExtra: magna?.[ladoAtual] || {},
      parvaStatus: superficiais?.[ladoAtual]?.["Safena Parva"],
      parvaExtra: parva?.[ladoAtual] || {},
      perfurantes: perfurantes?.[ladoAtual],
      profundas: profundas?.[ladoAtual],
      mirrored: ladoAtual === "Esquerdo",
      jsfDiametro: jsfDiametro?.[ladoAtual],
      jspDiametro: jspDiametro?.[ladoAtual],
    });
    const dataUrl = await svgParaImagemDataUrl(svg, 640, 680);

    doc.addPage();
    let y = 16;
    doc.setFontSize(13);
    doc.setFont(undefined, "bold");
    doc.text(`Esquema de Mapeamento Venoso — Membro Inferior ${ladoAtual}`, pageWidth / 2, y, { align: "center" });
    y += 8;
    doc.setFont(undefined, "normal");

    const imgWidthMm = 170;
    const imgHeightMm = imgWidthMm * (680 / 640);
    const x = (pageWidth - imgWidthMm) / 2;
    doc.addImage(dataUrl, "JPEG", x, y, imgWidthMm, imgHeightMm);
    y += imgHeightMm + 6;

    doc.setFontSize(8.5);
    const legenda = [
      ["Veia suficiente", CORES["pérvia e competente"]],
      ["Veia insuficiente", CORES["pérvia e incompetente"]],
      ["Trombose", CORES["não compressível e sem fluxo (trombose)"]],
      ["Recanalização parcial", CORES["recanalização parcial"]],
      ["Veia ausente", CORES["ausente"]],
    ];
    let lx = (pageWidth - 150) / 2;
    legenda.forEach(([label, cor]) => {
      const rgb = hexParaRgb(cor);
      doc.setFillColor(rgb.r, rgb.g, rgb.b);
      doc.rect(lx, y - 2.6, 4, 2, "F");
      doc.setTextColor(90, 100, 110);
      doc.text(label, lx + 6, y);
      lx += 6 + doc.getTextWidth(label) + 8;
    });
    doc.setTextColor(0, 0, 0);
    y += 8;

    if (conclusoes.length) {
      doc.setFontSize(9.5);
      doc.setFont(undefined, "bold");
      doc.text("Achados do mapeamento:", 20, y);
      y += 5;
      doc.setFont(undefined, "normal");
      conclusoes.forEach((c) => {
        doc.text(`• ${c}`, 22, y);
        y += 5;
      });
    }
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
  jsfDiametro,
  jspDiametro,
}) {
  const [gerandoPdf, setGerandoPdf] = useState(false);

  const ladosParaMostrar = lado === "Ambos" ? ["Direito", "Esquerdo"] : lado ? [lado] : [];

  const esquemas = useMemo(() => {
    const out = {};
    ladosParaMostrar.forEach((ladoAtual) => {
      out[ladoAtual] = montarSvgLado({
        magnaStatus: superficiais?.[ladoAtual]?.["Safena Magna"],
        magnaExtra: magna?.[ladoAtual] || {},
        parvaStatus: superficiais?.[ladoAtual]?.["Safena Parva"],
        parvaExtra: parva?.[ladoAtual] || {},
        perfurantes: perfurantes?.[ladoAtual],
        profundas: profundas?.[ladoAtual],
        mirrored: ladoAtual === "Esquerdo",
        jsfDiametro: jsfDiametro?.[ladoAtual],
        jspDiametro: jspDiametro?.[ladoAtual],
      });
    });
    return out;
  }, [lado, superficiais, magna, parva, perfurantes, profundas, jsfDiametro, jspDiametro]);

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

        const dataUrl = await svgParaImagemDataUrl(esquemas[ladoAtual].svg, 640, 680);

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
        const imgHeightMm = imgWidthMm * (680 / 640);
        const x = (pageWidth - imgWidthMm) / 2;
        doc.addImage(dataUrl, "JPEG", x, y, imgWidthMm, imgHeightMm);
        y += imgHeightMm + 6;

        doc.setFontSize(8.5);
        const legenda = [
          ["Veia suficiente", CORES["pérvia e competente"]],
          ["Veia insuficiente", CORES["pérvia e incompetente"]],
          ["Trombose", CORES["não compressível e sem fluxo (trombose)"]],
          ["Recanalização parcial", CORES["recanalização parcial"]],
          ["Veia ausente", CORES["ausente"]],
        ];
        let lx = (pageWidth - 150) / 2;
        legenda.forEach(([label, cor]) => {
          const rgb = hexParaRgb(cor);
          doc.setFillColor(rgb.r, rgb.g, rgb.b);
          doc.rect(lx, y - 2.6, 4, 2, "F");
          doc.setTextColor(90, 100, 110);
          doc.text(label, lx + 6, y);
          lx += 6 + doc.getTextWidth(label) + 8;
        });
        doc.setTextColor(0, 0, 0);
        y += 8;

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
        }
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
          <h2 style={{ margin: 0, fontSize: "clamp(16px, 3vw, 20px)", color: "#1c3d5a" }}>Esquema de Mapeamento Venoso</h2>
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
