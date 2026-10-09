import React, { useState } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { svgParaImagemDataUrl } from "../utils/svgParaImagem";
import { criarCurva, pontoEm, fita, linha, fitaFusiforme } from "../utils/curvas";
import { BRACO_W, BRACO_H, SILHUETA_BRACO, CLAVICULA, P, ART, VEI } from "./MapaMMSS";
import { COR_ART, COR_ENXERTO, COR_LESAO_ENXERTO } from "./ArteriaCurva";
import { CamposSitioFAV, CamposConfeccaoGeral, CamposAvaliacaoFAV } from "./CamposFistula";
import MapaLayout, { PreviewImagemPdf } from "./MapaLayout";
import {
  SITIOS_ARTERIAIS,
  SITIOS_VENOSOS,
  NOME_SITIO,
  ehArterial,
  sitioAdequado,
  ehProtese,
  normalizarExtra,
} from "../utils/favLaudo";

// Membro superior para FAV: artérias (vermelho) e veias superficiais (azul)
// do braço e antebraço, sobre o mesmo desenho do braço do MMSS (braço direito
// nativo; o esquerdo é espelhado).
// - Confecção: pontos de medida clicáveis, verdes quando atendem o critério
//   de calibre (>= 2,0 mm), laranja quando não atendem.
// - Avaliação: a FAV desenhada conforme o tipo — veia arterializada em roxo,
//   prótese em azul — com estenose, aneurisma e trombo no local informado.

const COR_VEIA = "#1f6fb2";
const COR_VEIA_RUIM = "#2b2f33";
const COR_ARTERIALIZADA = "#8e44ad";
const COR_OK = "#27ae60";

const ARTERIAS_DESENHO = ["Artéria Axilar", "Artéria Braquial", "Artéria Radial", "Artéria Ulnar"];
const VEIAS_DESENHO = [
  "Veia Axilar", "Veia Cefálica (braço)", "Veia Cefálica (antebraço)", "Veia Basílica (braço)",
  "Veia Basílica (antebraço)", "Veia Intermédia do Cotovelo",
];

const CURVAS_ART = Object.fromEntries(ARTERIAS_DESENHO.map((n) => [n, criarCurva(P(ART[n].pts), ART[n].half)]));
const CURVAS_VEI = Object.fromEntries(VEIAS_DESENHO.map((n) => [n, criarCurva(P(VEI[n].curvas[0]), VEI[n].half)]));
// veias braquiais (pareadas, profundas): referência para a FAV braquiobraquial
const CURVAS_BRAQUIAIS = VEI["Veias Braquiais"].curvas.map((pts) => criarCurva(P(pts), VEI["Veias Braquiais"].half));
const ARCO_PALMAR = criarCurva(P([[76, 566], [80, 596], [92, 606], [104, 596], [108, 566]]), 1);

// Pontos de medida (coordenadas do desenho original, antes de P).
const POS_SITIO = {
  braquial: [102, 322], radial: [73, 532], ulnar: [111, 532],
  cefalicaPunho: [62, 556], cefalicaAntebraco: [55, 440], cefalicaCotovelo: [57, 352], cefalicaBraco: [52, 232],
  basilicaAntebraco: [127, 440], basilicaCotovelo: [128, 342], basilicaBraco: [129, 262],
  intermedia: [90, 357], braquialVeia: [115, 226], axilar: [121, 156],
};
const LATERAIS = ["braquialVeia", "radial", "cefalicaPunho", "cefalicaAntebraco", "cefalicaCotovelo", "cefalicaBraco"];
// Qual veia do desenho cada ponto representa (para escurecer a trombosada).
const VEIA_DO_SITIO = {
  cefalicaPunho: "Veia Cefálica (antebraço)", cefalicaAntebraco: "Veia Cefálica (antebraço)",
  cefalicaCotovelo: "Veia Cefálica (braço)", cefalicaBraco: "Veia Cefálica (braço)",
  basilicaAntebraco: "Veia Basílica (antebraço)", basilicaCotovelo: "Veia Basílica (braço)",
  basilicaBraco: "Veia Basílica (braço)", intermedia: "Veia Intermédia do Cotovelo", axilar: "Veia Axilar",
  braquialVeia: "Veias Braquiais",
};

// Traçado de cada tipo de FAV: anastomose no início, veia (ou prótese) até o fim.
const GEOMETRIA_FAV = {
  "Radiocefálica (punho)": [[72, 548], [62, 548], [59, 500], [55, 440], [55, 384], [58, 342], [54, 290], [52, 232], [55, 174], [70, 128], [104, 112], [140, 124]],
  "Braquiocefálica (cotovelo)": [[99, 336], [80, 337], [62, 334], [56, 300], [52, 232], [55, 174], [70, 128], [104, 112], [140, 124]],
  "Braquiobasílica (com transposição)": [[104, 318], [96, 290], [91, 250], [95, 214], [106, 194], [117, 186]],
  // anastomose braquial–intermédia, drenando pela basílica do braço
  "Braquiobasílica via veia intermédia do cotovelo": [[100, 346], [112, 343], [127, 338], [130, 296], [128, 252], [122, 216], [116, 188]],
  // veia braquial superficializada até a axilar
  "Braquiobraquial (com transposição)": [[103, 326], [111, 300], [114, 262], [115, 222], [116, 190]],
  "Prótese em alça no antebraço": [[99, 344], [86, 392], [80, 440], [86, 482], [100, 494], [114, 482], [120, 440], [124, 392], [127, 346]],
  "Prótese braquioaxilar": [[106, 300], [94, 262], [94, 222], [104, 198], [118, 182]],
};
const CURVAS_FAV = Object.fromEntries(Object.entries(GEOMETRIA_FAV).map(([t, pts]) => [t, criarCurva(P(pts), ehProtese(t) ? 3.2 : 3.6)]));
const T_LOCAL = {
  "Justa-anastomótica": 0.06, "Segmento de punção": 0.4, "Arco da cefálica": 0.92, "Veia de saída": 0.99,
  "Anastomose arterial": 0.03, "Corpo da prótese": 0.5, "Anastomose venosa": 0.97,
};

const ROTULOS = [
  ["V. axilar", 182, 150, "Veia Axilar", "v"],
  ["V. cefálica", 2, 196, "Veia Cefálica (braço)", "v"],
  ["V. basílica", 182, 236, "Veia Basílica (braço)", "v"],
  ["A. braquial", 182, 288, "Artéria Braquial", "a"],
  ["V. cefálica", 2, 420, "Veia Cefálica (antebraço)", "v"],
  ["V. basílica", 182, 420, "Veia Basílica (antebraço)", "v"],
  ["A. radial", 4, 480, "Artéria Radial", "a"],
  ["A. ulnar", 182, 486, "Artéria Ulnar", "a"],
];

function alvo(nome, tipo, ly) {
  const c = tipo === "a" ? CURVAS_ART[nome] : CURVAS_VEI[nome];
  const a = c.amostras.reduce((acc, s) => (Math.abs(s.y - ly) < Math.abs(acc.y - ly) ? s : acc));
  return [a.x, a.y];
}

function corPonto(sitio, s) {
  if (!ehArterial(sitio) && s.situacao && s.situacao !== "Pérvia") return COR_VEIA_RUIM;
  if (sitio === "axilar") return s.fluxo === "Fásico" ? "#ffffff" : COR_LESAO_ENXERTO;
  const ok = sitioAdequado(sitio, s);
  return ok === null ? "#ffffff" : ok ? COR_OK : COR_LESAO_ENXERTO;
}

function DesenhoFistula({ enx }) {
  const tipo = enx.tipo;
  const c = CURVAS_FAV[tipo];
  if (!c) return null;
  const protese = ehProtese(tipo);
  const ocluida = enx.status !== "Pérvia";
  const cor = ocluida ? COR_ENXERTO.ocluido : protese ? COR_ENXERTO.pervio : COR_ARTERIALIZADA;
  const tAneur = T_LOCAL[enx.aneurismaLocal] ?? 0.4;
  const tEst = T_LOCAL[enx.estenoseLocal] ?? 0.4;
  const anast = pontoEm(c, 0);
  const kAneur = Math.min(3.4, Math.max(2, (parseFloat(enx.aneurismaDiametro) || 14) / 6));
  return (
    <g style={{ pointerEvents: "none" }}>
      {enx.hematoma && <ellipse cx={anast.x} cy={anast.y} rx={13} ry={9} fill="#f1c40f" opacity={0.35} />}
      {enx.aneurisma && !ocluida && (
        <path d={fitaFusiforme(c, Math.max(0, tAneur - 0.08), Math.min(1, tAneur + 0.08), kAneur)} fill={cor} stroke="#5b2c6f" strokeWidth={0.8} />
      )}
      <path d={linha(c)} fill="none" stroke="#ffffff" strokeWidth={c.amostras[0].hw * 2 + 3} strokeLinecap="round" opacity={0.9} />
      <path d={linha(c)} fill="none" stroke={cor} strokeWidth={c.amostras[0].hw * 2} strokeLinecap="round" strokeDasharray={ocluida ? "6 4" : undefined} />
      {enx.tromboParcial && !ocluida && <path d={fita(c, Math.max(0, tAneur - 0.06), Math.min(1, tAneur + 0.06), 0.45)} fill={COR_ART.trombo} />}
      {enx.estenose && (() => { const p = pontoEm(c, tEst); return <circle cx={p.x} cy={p.y} r={6.5} fill="none" stroke={COR_LESAO_ENXERTO} strokeWidth={2.4} />; })()}
      <circle cx={anast.x} cy={anast.y} r={4.2} fill="#ffffff" stroke={protese ? COR_ENXERTO.pervio : COR_ARTERIALIZADA} strokeWidth={2} />
    </g>
  );
}

export function DesenhoFAV({ lado, extra, onSelecionar, selecionado, width = "100%", height, style }) {
  const mirrored = lado === "Esquerdo";
  const mx = (x) => (mirrored ? BRACO_W - x : x);
  const e = normalizarExtra(extra);
  const confeccao = e.modo !== "Avaliação";
  const sitios = e.confeccao.sitios;
  const enx = e.avaliacao;
  // veia escura quando algum ponto dela está trombosado/esclerosado
  const veiaRuim = (nome) => confeccao && Object.entries(VEIA_DO_SITIO).some(([s, v]) => v === nome && sitios[s].situacao && sitios[s].situacao !== "Pérvia");
  const roubo = !confeccao && enx.roubo && enx.status === "Pérvia";
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 ${BRACO_W} ${BRACO_H}`} width={width} height={height} style={style}>
      <g transform={mirrored ? `translate(${BRACO_W},0) scale(-1,1)` : undefined}>
        <path d={SILHUETA_BRACO} fill="#f3d9bb" stroke="#a97a4e" strokeWidth={1.5} />
        <path d={CLAVICULA} fill="none" stroke="#c9a27a" strokeWidth={2.2} strokeLinecap="round" opacity={0.7} />
        {CURVAS_BRAQUIAIS.map((c, i) => <path key={i} d={fita(c)} fill={veiaRuim("Veias Braquiais") ? COR_VEIA_RUIM : COR_VEIA} opacity={confeccao ? 0.7 : 0.4} />)}
        {ARTERIAS_DESENHO.map((n) => <path key={n} d={fita(CURVAS_ART[n])} fill={COR_ART.normal} />)}
        <path d={linha(ARCO_PALMAR)} fill="none" stroke="#e8b4ae" strokeWidth={2} />
        {VEIAS_DESENHO.map((n) => <path key={n} d={fita(CURVAS_VEI[n])} fill={veiaRuim(n) ? COR_VEIA_RUIM : COR_VEIA} opacity={confeccao ? 1 : 0.55} />)}
        {!confeccao && <DesenhoFistula enx={enx} />}
        {!confeccao && onSelecionar && CURVAS_FAV[enx.tipo] && (
          <path d={linha(CURVAS_FAV[enx.tipo])} fill="none" stroke={selecionado === "fav" ? "#0eb8d0" : "#000"} strokeOpacity={selecionado === "fav" ? 0.35 : 0.001}
            strokeWidth={16} strokeLinecap="round" style={{ cursor: "pointer" }} onClick={() => onSelecionar("fav")} />
        )}
      </g>

      {ROTULOS.map(([txt, lx, ly, nome, tipo]) => {
        const [ax, ay] = alvo(nome, tipo, ly);
        const fonte = lx < 60 ? 9 : 10;
        const w = txt.length * fonte * 0.6;
        const xLinha = ax > lx ? lx + w + 3 : lx - 3;
        return (
          <g key={txt + ly}>
            <line x1={mx(ax)} y1={ay} x2={mx(xLinha)} y2={ly} stroke="#9aa5b1" strokeWidth={0.8} />
            <text x={mx(lx)} y={ly + 3} fontFamily="monospace" fontSize={fonte} fill="#1a2530" textAnchor={mirrored ? "end" : "start"}>{txt}</text>
          </g>
        );
      })}

      {roubo && (() => {
        const p = pontoEm(CURVAS_ART["Artéria Radial"], 0.55);
        return (
          <g>
            <circle cx={mx(p.x)} cy={p.y} r={6} fill="#ffffff" stroke={COR_LESAO_ENXERTO} strokeWidth={1.4} />
            <text x={mx(p.x)} y={p.y + 3} fontFamily="monospace" fontSize={8} fontWeight="bold" fill={COR_LESAO_ENXERTO} textAnchor="middle">R</text>
          </g>
        );
      })()}

      {confeccao && Object.entries(POS_SITIO).map(([sitio, pos]) => {
        const [[px, py]] = P([pos]);
        const s = sitios[sitio];
        const ativo = selecionado === sitio;
        const lateral = LATERAIS.includes(sitio);
        const valor = s.diametro ? String(s.diametro).replace(".", ",") : "";
        const esquerda = lateral !== mirrored; // texto do lado de fora do vaso
        return (
          <g key={sitio} style={onSelecionar ? { cursor: "pointer" } : undefined} onClick={onSelecionar ? () => onSelecionar(sitio) : undefined}>
            {ativo && <circle cx={mx(px)} cy={py} r={10} fill="#0eb8d0" opacity={0.35} />}
            <circle cx={mx(px)} cy={py} r={5.2} fill={corPonto(sitio, s)} stroke={ehArterial(sitio) ? "#7b241c" : "#174f80"} strokeWidth={1.6} />
            {valor && (
              <text x={mx(px) + (esquerda ? -8 : 8)} y={py + 3.5} fontFamily="sans-serif" fontSize={9.5} fontWeight="bold"
                fill="#1a2530" stroke="#ffffff" strokeWidth={2.6} paintOrder="stroke" textAnchor={esquerda ? "end" : "start"}>{valor}</text>
            )}
            {onSelecionar && <circle cx={mx(px)} cy={py} r={11} fill="#000" opacity={0.001} />}
          </g>
        );
      })}

      <text x={mx(12)} y={14} fontFamily="sans-serif" fontSize="9" fill="#5c6b78" textAnchor={mirrored ? "end" : "start"}>lateral</text>
      <text x={mx(292)} y={14} fontFamily="sans-serif" fontSize="9" fill="#5c6b78" textAnchor={mirrored ? "start" : "end"}>medial</text>
      <text x={mx(222)} y={BRACO_H - 8} fontFamily="monospace" fontSize="11" textAnchor="middle" fill="#5c6b78">{lado === "Esquerdo" ? "MSE" : "MSD"} - Visão anterior</text>
    </svg>
  );
}

// ---------- Legenda ----------
const ITENS_CONFECCAO = [
  ["Artéria", COR_ART.normal],
  ["Veia", COR_VEIA],
  ["Calibre adequado (>= 2,0 mm)", COR_OK],
  ["Abaixo do critério", COR_LESAO_ENXERTO],
  ["Trombosada / esclerosada", COR_VEIA_RUIM],
];
const ITENS_AVALIACAO = [
  ["Artéria", COR_ART.normal],
  ["Veia arterializada (FAV)", COR_ARTERIALIZADA],
  ["Prótese", COR_ENXERTO.pervio],
  ["Ocluída", COR_ENXERTO.ocluido],
];
const itensLegenda = (modo) => (modo === "Avaliação" ? ITENS_AVALIACAO : ITENS_CONFECCAO);
const textoLegenda = (modo) => (modo === "Avaliação"
  ? "Círculo branco = anastomose · círculo laranja = estenose · dilatação = aneurisma · cinza = trombo · R = roubo"
  : "Clique em um ponto para medir · número = diâmetro em mm · ponto branco = não medido");

function LegendaFAV({ modo }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 10px", justifyContent: "center", fontSize: 11, color: "#5c6b78" }}>
      {itensLegenda(modo).map(([t, c]) => (
        <span key={t} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
          <span style={{ width: 14, height: 6, background: c, borderRadius: 3, display: "inline-block" }} /> {t}
        </span>
      ))}
      <span>{textoLegenda(modo)}</span>
    </div>
  );
}

// ---------- PDF ----------
function hexParaRgb(hex) {
  const m = hex.replace("#", "");
  return { r: parseInt(m.substring(0, 2), 16), g: parseInt(m.substring(2, 4), 16), b: parseInt(m.substring(4, 6), 16) };
}

export async function adicionarMapaFAVAoPdf(doc, lado, extra) {
  const e = normalizarExtra(extra);
  const pageWidth = doc.internal.pageSize.getWidth();
  const svg = renderToStaticMarkup(<DesenhoFAV lado={lado} extra={e} width={BRACO_W * 2} height={BRACO_H * 2} />);
  const dataUrl = await svgParaImagemDataUrl(svg, BRACO_W * 2, BRACO_H * 2);
  doc.addPage();
  let y = 16;
  doc.setFontSize(13);
  doc.setFont(undefined, "bold");
  const titulo = e.modo === "Avaliação" ? "Mapa — Avaliação de Fístula Arteriovenosa" : "Mapa — Confecção de Fístula Arteriovenosa";
  doc.text(`${titulo} (${lado === "Esquerdo" ? "MSE" : "MSD"})`, pageWidth / 2, y, { align: "center" });
  doc.setFont(undefined, "normal");
  y += 6;
  const alturaMm = 225;
  const larguraMm = alturaMm * (BRACO_W / BRACO_H);
  doc.addImage(dataUrl, "JPEG", (pageWidth - larguraMm) / 2, y, larguraMm, alturaMm);
  y += alturaMm + 7;
  doc.setFontSize(8.5);
  const itens = itensLegenda(e.modo);
  const larguraItens = itens.reduce((acc, [t]) => acc + 6 + doc.getTextWidth(t) + 8, -8);
  let x = (pageWidth - larguraItens) / 2;
  itens.forEach(([t, cor]) => {
    const rgb = hexParaRgb(cor);
    doc.setFillColor(rgb.r, rgb.g, rgb.b);
    doc.rect(x, y - 2.6, 4, 2, "F");
    doc.setTextColor(90, 100, 110);
    doc.text(t, x + 6, y);
    x += 6 + doc.getTextWidth(t) + 8;
  });
  doc.setFontSize(7.5);
  y += 4.5;
  doc.text(textoLegenda(e.modo).replace("Clique em um ponto para medir · ", "").replace(/·/g, "  ·  "), pageWidth / 2, y, { align: "center" });
  doc.setTextColor(0, 0, 0);
}

// ---------- VENO.AI Map ----------
const estiloLaudo = { background: "#f7f9fa", border: "1px solid #dfe6ec", color: "#222", borderRadius: 8, padding: 10, fontSize: 12, whiteSpace: "pre-wrap", margin: 0, maxHeight: 320, overflowY: "auto" };
const NOME_CURTO = {
  braquial: "A. braquial", radial: "A. radial", ulnar: "A. ulnar",
  cefalicaPunho: "Cefálica punho", cefalicaAntebraco: "Cefálica antebraço", cefalicaCotovelo: "Cefálica cotovelo", cefalicaBraco: "Cefálica braço",
  basilicaAntebraco: "Basílica antebraço", basilicaCotovelo: "Basílica cotovelo", basilicaBraco: "Basílica braço",
  intermedia: "Intermédia cotovelo", braquialVeia: "V. braquial", axilar: "V. axilar",
};

function BotaoModo({ ativo, children, onClick }) {
  return (
    <button type="button" onClick={onClick} style={{
      flex: 1, padding: "9px 10px", borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: "pointer",
      border: "1.5px solid #0eb8d0", background: ativo ? "#0eb8d0" : "#fff", color: ativo ? "#fff" : "#0a7f91",
    }}>{children}</button>
  );
}

export function MapaInterativoFAV({
  aberto, onFechar, lado, extra, onExtraChange, observacoes, onObservacoes, laudo,
  incluirMapaPdf, onIncluirMapaPdf, onSalvarTXT, onSalvarPDF, onSalvarExame, embutido,
}) {
  const [selecionado, setSelecionado] = useState(null);
  const [mostrarPreview, setMostrarPreview] = useState(false);
  if (!aberto) return null;
  const e = normalizarExtra(extra);
  const confeccao = e.modo !== "Avaliação";
  const setConfeccao = (c) => onExtraChange({ ...e, confeccao: c });
  const setAvaliacao = (a) => onExtraChange({ ...e, avaliacao: a });
  const setSitio = (s, v) => setConfeccao({ ...e.confeccao, sitios: { ...e.confeccao.sitios, [s]: v } });

  let painel = null;
  let tituloPainel = "";
  if (confeccao && selecionado && NOME_SITIO[selecionado]) {
    painel = <CamposSitioFAV sitio={selecionado} valores={e.confeccao.sitios[selecionado]} onChange={(v) => setSitio(selecionado, v)} />;
    tituloPainel = NOME_SITIO[selecionado];
  } else if (!confeccao && selecionado === "fav") {
    painel = <CamposAvaliacaoFAV avaliacao={e.avaliacao} onChange={setAvaliacao} />;
    tituloPainel = e.avaliacao.tipo ? `FAV ${e.avaliacao.tipo.toLowerCase()}` : "FAV";
  }

  const legenda = (
    <>
      {confeccao && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center", marginBottom: 8 }}>
          {[...SITIOS_ARTERIAIS, ...SITIOS_VENOSOS].map(([k]) => (
            <button key={k} type="button" title={NOME_SITIO[k]} onClick={() => setSelecionado(k)} style={{
              background: selecionado === k ? "#0eb8d0" : "#fff", color: selecionado === k ? "#fff" : ehArterial(k) ? "#a93226" : "#174f80",
              border: `1px solid ${ehArterial(k) ? "#e6a39b" : "#9cc3e6"}`, borderRadius: 6, padding: "4px 8px", fontSize: 11.5, fontWeight: 600, cursor: "pointer",
            }}>{NOME_CURTO[k]}</button>
          ))}
        </div>
      )}
      <LegendaFAV modo={e.modo} />
    </>
  );

  return (
    <>
      <MapaLayout
        embutido={embutido}
        titulo="Fístula Arteriovenosa"
        onFechar={onFechar}
        desenho={<DesenhoFAV lado={lado} extra={e} onSelecionar={setSelecionado} selecionado={selecionado} style={{ display: "block", width: "100%", maxWidth: 360, maxHeight: "74vh" }} />}
        legenda={legenda}
        painel={painel}
        tituloPainel={tituloPainel}
        onFecharPainel={() => setSelecionado(null)}
        conteudo={
          <>
            <div style={{ display: "flex", gap: 8 }}>
              <BotaoModo ativo={confeccao} onClick={() => { setSelecionado(null); onExtraChange({ ...e, modo: "Confecção" }); }}>Confecção (mapeamento)</BotaoModo>
              <BotaoModo ativo={!confeccao} onClick={() => { setSelecionado(null); onExtraChange({ ...e, modo: "Avaliação" }); }}>Avaliação de FAV</BotaoModo>
            </div>
            <div className="mapa-claro">
              {confeccao
                ? <CamposConfeccaoGeral confeccao={e.confeccao} onChange={setConfeccao} />
                : <CamposAvaliacaoFAV avaliacao={e.avaliacao} onChange={setAvaliacao} />}
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>Observações:</div>
              <textarea
                value={observacoes || ""}
                onChange={(ev) => onObservacoes(ev.target.value)}
                placeholder="Observações adicionais..."
                style={{ width: "100%", minHeight: 50, fontSize: 13, borderRadius: 6, border: "1.5px solid #0eb8d0", padding: 8, resize: "vertical", boxSizing: "border-box" }}
              />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Laudo — atualizado em tempo real:</div>
              <pre style={estiloLaudo}>{laudo}</pre>
            </div>
          </>
        }
        incluirPdf={incluirMapaPdf} onIncluirPdf={onIncluirMapaPdf}
        onVisualizarImagem={() => setMostrarPreview(true)}
        onSalvarTXT={onSalvarTXT} onSalvarPDF={onSalvarPDF} onSalvarExame={onSalvarExame}
      />
      {mostrarPreview && (
        <PreviewImagemPdf titulo={confeccao ? "Mapa — Confecção de Fístula Arteriovenosa" : "Mapa — Avaliação de Fístula Arteriovenosa"} onFechar={() => setMostrarPreview(false)}>
          <div style={{ maxWidth: 360, margin: "0 auto" }}>
            <DesenhoFAV lado={lado} extra={e} style={{ display: "block", width: "100%" }} />
          </div>
          <div style={{ marginTop: 8 }}><LegendaFAV modo={e.modo} /></div>
        </PreviewImagemPdf>
      )}
    </>
  );
}
