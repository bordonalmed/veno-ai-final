import React, { useState } from "react";
import {
  MEDIAL_SILHOUETTE,
  POSTERIOR_SILHOUETTE,
  POPLITEA_RIBBON,
  VSM_SPINE, VSM_HALF,
  VSP_SPINE, VSP_HALF,
  LANDMARK_MAGNA, LANDMARK_PARVA,
  FEMORAL_TRUNK_SPINE, FEMORAL_TRUNK_HALF, FEMORAL_COMUM_FIM,
  FEMORAL_PROFUNDA_SPINE, FEMORAL_PROFUNDA_HALF,
  CORES,
  construirSegmentosVeia,
  corStatusProfundo,
  fitaVeiaSimples,
  posicaoPerfurante,
  trianguloPontos,
  PERFURANTE_TRIANGULO_RAIO,
} from "../utils/vascularMapping";
import { SafenaMagnaExtra, SafenaParvaExtra } from "./SafenaExtraFields";
import {
  profOptions, supOptions, perfurantesStatusOptions, perfurantesSegmentoOptions,
  varizesTipoOptions, varizesRegiaoLabel,
  montarLaudo,
} from "../utils/mmiiVenosoLaudo";

// Layout simples e direto: só 2 vistas (medial + posterior — as mesmas do
// Esquema de Mapeamento), sem régua/grade. As veias profundas da coxa
// (Femoral Comum/Superficial/Profunda) entram na vista medial, ao lado da
// Safena Magna; as veias profundas da panturrilha entram na vista
// posterior — Tibiais/Gastrocnêmicas/Soleares como pequenos marcadores
// (ficam muito próximas entre si na realidade; tentar traçar 4 linhas
// separadas ali colide com a Safena Parva e entre si).
const COL_WIDTH = 320;
const COLS = [
  { key: "medial", label: "medial", tx: -75 },
  { key: "posterior", label: "posterior", tx: COL_WIDTH - 75 },
];
const VIEW_TY = 16;
const VIEW_W = COL_WIDTH * 2;
const VIEW_H = 660;

function mapaBotaoStyle(background) {
  return {
    padding: "6px 14px", borderRadius: 6, border: "none", background, color: "#fff",
    cursor: "pointer", fontWeight: 600, fontSize: 12,
  };
}

function hitPath(d, onClick, key, selecionado, largura = 10) {
  const ativo = selecionado === key;
  return (
    <path
      d={d}
      fill="none"
      stroke={ativo ? "#0eb8d0" : "#000"}
      strokeOpacity={ativo ? 0.35 : 0.001}
      strokeWidth={largura}
      strokeLinecap="round"
      style={{ cursor: "pointer" }}
      onClick={onClick}
    />
  );
}

// Marcadores compactos (bolinha + rótulo curto) para as veias profundas da
// panturrilha — mais fáceis de tocar num tablet do que 4 linhas finas e
// coladas, e continuam dentro do contorno da perna.
const CALF_DOTS = [
  { key: "Veias Gastrocnêmicas", label: "Gc", x: 123, y: 402 },
  { key: "Veias Tibiais anteriores", label: "Ta", x: 143, y: 402 },
  { key: "Veias Soleares", label: "So", x: 123, y: 428 },
  { key: "Veias Tibiais posteriores", label: "Tp", x: 143, y: 428 },
];

// Cores próprias para os "adesivos" de variz (diferentes das cores de status
// dos vasos, pra não confundir o usuário: variz não é achado de status de
// veia, é um achado de pele à parte).
const VARIZ_CORES = {
  "Varizes Superficiais": "#6f42c1",
  "Varizes Reticulares": "#2f7dd1",
  "Microvarizes": "#c0392b",
};

// O contorno do ícone de variz é uma elipse (mais alta que larga, não um
// círculo): a faixa livre entre a perna e a Safena Magna na vista medial é
// estreita na horizontal mas sobra bastante espaço na vertical, então
// esticar pra cima/baixo é o jeito de deixar o alvo bem maior (o dobro de
// área do círculo antigo) sem esbarrar na Safena Magna nem sair do
// contorno da perna. Valores verificados (programaticamente, com folga)
// contra os dois limites em todos os 4 pontos — ver vascularMapping.test.js.
export const VARIZ_ICON_RX = 8;
export const VARIZ_ICON_RY_VAZIO = 12.25;
export const VARIZ_ICON_RY_TIPO = 20.25;

// Ícone por tipo de variz, "colado" na região clicada — sem tipo, mostra um
// círculo tracejado com "+" (toque pra marcar).
function VarizIcon({ tipo, cx, cy, ativo }) {
  const cor = VARIZ_CORES[tipo];
  if (!tipo) {
    return (
      <g>
        <ellipse cx={cx} cy={cy} rx={VARIZ_ICON_RX} ry={VARIZ_ICON_RY_VAZIO} fill="#fff" fillOpacity={0.6} stroke={ativo ? "#0eb8d0" : "#9aa7b0"} strokeWidth={ativo ? 2.2 : 1.4} strokeDasharray="3 2.5" />
        <line x1={cx - 4} y1={cy} x2={cx + 4} y2={cy} stroke={ativo ? "#0eb8d0" : "#9aa7b0"} strokeWidth={1.4} />
        <line x1={cx} y1={cy - 4} x2={cx} y2={cy + 4} stroke={ativo ? "#0eb8d0" : "#9aa7b0"} strokeWidth={1.4} />
      </g>
    );
  }
  if (tipo === "Varizes Superficiais") {
    // squiggle grosso (traço tortuoso, como uma variz visível)
    return (
      <g>
        <ellipse cx={cx} cy={cy} rx={VARIZ_ICON_RX} ry={VARIZ_ICON_RY_TIPO} fill="#fff" stroke={ativo ? "#0eb8d0" : cor} strokeWidth={ativo ? 2.4 : 1.4} />
        <path d={`M ${cx - 6.5},${cy + 3.9} Q ${cx - 3.25},${cy - 5.2} ${cx},${cy - 1.3} Q ${cx + 3.25},${cy + 3.9} ${cx + 6.5},${cy - 3.9}`} fill="none" stroke={cor} strokeWidth={2.4} strokeLinecap="round" />
      </g>
    );
  }
  if (tipo === "Varizes Reticulares") {
    // pequena malha/rede (linhas finas cruzadas)
    return (
      <g>
        <ellipse cx={cx} cy={cy} rx={VARIZ_ICON_RX} ry={VARIZ_ICON_RY_TIPO} fill="#fff" stroke={ativo ? "#0eb8d0" : cor} strokeWidth={ativo ? 2.4 : 1.4} />
        <path d={`M ${cx - 6.5},${cy - 3.9} L ${cx + 6.5},${cy - 3.9} M ${cx - 6.5},${cy + 3.9} L ${cx + 6.5},${cy + 3.9} M ${cx - 3.9},${cy - 6.5} L ${cx - 3.9},${cy + 6.5} M ${cx + 3.9},${cy - 6.5} L ${cx + 3.9},${cy + 6.5}`} stroke={cor} strokeWidth={1.2} />
      </g>
    );
  }
  // Microvarizes: pequeno buquê de tracinhos finos
  return (
    <g>
      <ellipse cx={cx} cy={cy} rx={VARIZ_ICON_RX} ry={VARIZ_ICON_RY_TIPO} fill="#fff" stroke={ativo ? "#0eb8d0" : cor} strokeWidth={ativo ? 2.4 : 1.4} />
      <path d={`M ${cx - 5.2},${cy - 2.6} l 3.25,1.95 M ${cx + 1.95},${cy - 5.2} l 1.3,3.9 M ${cx - 1.3},${cy + 1.3} l 3.9,2.6 M ${cx + 2.6},${cy + 2.6} l 2.6,-1.3`} stroke={cor} strokeWidth={1.5} strokeLinecap="round" />
    </g>
  );
}

// Posições fixas dos 4 marcadores de variz (coxa/perna/tornozelo/pé), recentradas
// na faixa livre entre o contorno da perna e a Safena Magna (verificado
// programaticamente, com folga) pra caber o ícone maior definido acima. O
// pé fica na vista posterior, abaixo do tornozelo, onde o desenho já alarga
// bastante (bem mais espaço ali do que perto do tornozelo).
export const VARIZ_SPOTS = [
  { regiao: "coxa", view: "medial", x: 123, y: 150 },
  { regiao: "perna", view: "medial", x: 128, y: 420 },
  { regiao: "tornozelo", view: "posterior", x: 144, y: 540 },
  { regiao: "pe", view: "posterior", x: 150, y: 595 },
];

const PROFUNDA_LABELS = {
  "Veia Femoral Comum": "Veia Femoral Comum",
  "Veia Femoral Superficial": "Veia Femoral Superficial",
  "Veia Femoral Profunda": "Veia Femoral Profunda",
  "Veia Poplítea": "Veia Poplítea",
  "Veias Tibiais anteriores": "Veias Tibiais Anteriores",
  "Veias Tibiais posteriores": "Veias Tibiais Posteriores",
  "Veias Gastrocnêmicas": "Veias Gastrocnêmicas",
  "Veias Soleares": "Veias Soleares",
};

export default function MapaInterativo({
  aberto, onFechar,
  lado, ladoAtivo, onTrocarLado,
  nome, data,
  profundas, superficiais, magna, parva, perfurantes, observacoes, varizes,
  jsfDiametro, jspDiametro,
  onProfundas, onSuperficiais, onMagna, onParva, onPerfurantes,
  onJsfDiametro, onJspDiametro, onVarizes, onObservacao,
  onSalvarExame, onSalvarTXT, onSalvarPDF, onAbrirMapeamentoVisual,
  incluirMapeamentoVisualPdf, onIncluirMapeamentoVisualPdf,
  anexos = [], onFileUpload, onDrop, onDragOver, onRemoveAnexo, formatFileSize,
}) {
  const [selecionado, setSelecionado] = useState(null);

  if (!aberto) return null;

  const l = ladoAtivo;
  const p = profundas?.[l] || {};
  const s = superficiais?.[l] || {};
  const m = magna?.[l] || {};
  const pv = parva?.[l] || {};
  const perfs = Array.isArray(perfurantes?.[l]) ? perfurantes[l] : [];
  const vz = varizes?.[l] || {};

  function selecionar(tipo, key) {
    setSelecionado({ tipo, key });
  }
  const chaveAtiva = selecionado ? `${selecionado.tipo}:${selecionado.key}` : null;

  // A geometria (silhuetas, veias) foi desenhada para a perna ESQUERDA.
  // Para a perna DIREITA, espelha o desenho (a perna direita é a imagem
  // espelhada da esquerda). Os rótulos de texto ficam fora do grupo
  // espelhado (usando mx() para a posição) para não saírem de cabeça
  // para baixo / invertidos.
  const mirrored = l === "Direito";
  const mirrorTransform = mirrored ? "translate(300,0) scale(-1,1)" : undefined;
  const mx = (x) => (mirrored ? 300 - x : x);

  // ---- Vista MEDIAL: JSF + Safena Magna + Femoral Comum/Superficial/Profunda ----
  const magnaResult = construirSegmentosVeia({
    spine: VSM_SPINE, half: VSM_HALF, landmark: LANDMARK_MAGNA,
    status: s["Safena Magna"], ini: m.inicio, fim: m.fim, iniVal: m.inicio_valor, fimVal: m.fim_valor,
  });
  const magnaHitD = fitaVeiaSimples(VSM_SPINE, VSM_HALF, LANDMARK_MAGNA.top, LANDMARK_MAGNA.tornozelo);
  const jsfCor = CORES[s["JSF"]] || CORES["pérvia e competente"];

  const comumD = fitaVeiaSimples(FEMORAL_TRUNK_SPINE, FEMORAL_TRUNK_HALF, LANDMARK_MAGNA.top, FEMORAL_COMUM_FIM);
  const superficialD = fitaVeiaSimples(FEMORAL_TRUNK_SPINE, FEMORAL_TRUNK_HALF, FEMORAL_COMUM_FIM, LANDMARK_MAGNA.joelho);
  const profundaFemD = fitaVeiaSimples(FEMORAL_PROFUNDA_SPINE, FEMORAL_PROFUNDA_HALF, FEMORAL_PROFUNDA_SPINE[0][1], FEMORAL_PROFUNDA_SPINE[FEMORAL_PROFUNDA_SPINE.length - 1][1]);

  // ---- Vista POSTERIOR: JSP + Veia Poplítea + Safena Parva + panturrilha ----
  const parvaResult = construirSegmentosVeia({
    spine: VSP_SPINE, half: VSP_HALF, landmark: LANDMARK_PARVA,
    status: s["Safena Parva"], ini: pv.inicio, fim: pv.fim, iniVal: pv.inicio_valor, fimVal: pv.fim_valor,
  });
  // Área de clique começa abaixo da faixa da Veia Poplítea (POPLITEA_RIBBON vai
  // até y~388), para não roubar o clique destinado a ela logo abaixo do JSP.
  const parvaHitD = fitaVeiaSimples(VSP_SPINE, VSP_HALF, 382, LANDMARK_PARVA.tornozelo);
  const jspCor = CORES[s["JSP"]] || CORES["pérvia e competente"];

  // ---- Marcadores de perfurante insuficiente (vista medial) ----
  // Quando há mais de um perfurante na mesma altura, empilha os marcadores
  // na VERTICAL (não na horizontal): perto do joelho a perna afunila e um
  // deslocamento lateral maior jogava os marcadores extras pra fora do
  // desenho.
  const perfMarkers = perfs
    .filter((perf) => perf && perf.status === "pérvia e incompetente" && perf.segmento)
    .map((perf, idx) => {
      const pos = posicaoPerfurante(perf.segmento, perf.valor);
      if (!pos) return null;
      return { x: pos.x, y: pos.y + idx * 12 };
    })
    .filter(Boolean);

  const colMedial = COLS[0], colPosterior = COLS[1];

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 2000,
      display: "flex", alignItems: "flex-start", justifyContent: "center", overflowY: "auto", padding: "clamp(8px,2vw,24px)",
    }}>
      <div style={{
        background: "#fff", borderRadius: 12, padding: "clamp(12px,2vw,20px)", maxWidth: 820, width: "100%",
        boxShadow: "0 8px 40px rgba(0,0,0,0.4)", color: "#1a2530",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, flexWrap: "wrap", gap: 8 }}>
          <h2 style={{ margin: 0, fontSize: "clamp(16px,3vw,20px)" }}>Mapa Interativo — Sistema Venoso ({l})</h2>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {lado === "Ambos" && (
              <div style={{ display: "flex", gap: 4 }}>
                {["Direito", "Esquerdo"].map((op) => (
                  <button key={op} onClick={() => { onTrocarLado(op); setSelecionado(null); }} style={{
                    padding: "4px 10px", borderRadius: 6, border: "1px solid #0eb8d0",
                    background: ladoAtivo === op ? "#0eb8d0" : "#fff", color: ladoAtivo === op ? "#fff" : "#0eb8d0",
                    cursor: "pointer", fontWeight: 600, fontSize: 13,
                  }}>{op}</button>
                ))}
              </div>
            )}
            <button onClick={onFechar} style={{
              padding: "6px 14px", borderRadius: 6, border: "none", background: "#c0392b", color: "#fff",
              cursor: "pointer", fontWeight: 600,
            }}>Fechar</button>
          </div>
        </div>
        <p style={{ margin: "0 0 8px 0", fontSize: 12, color: "#5c6b78" }}>
          Toque numa veia do desenho para marcar o achado. O laudo abaixo é atualizado em tempo real.
        </p>

        <div style={{ width: "100%", display: "flex", justifyContent: "center", border: "1px solid #dfe6ec", borderRadius: 8, background: "#fbfbfb" }}>
          <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} width="100%" style={{ maxWidth: 480, display: "block" }}>
            {/* MEDIAL: JSF + Safena Magna + Femoral Comum/Superficial/Profunda + perfurantes */}
            <g transform={`translate(${colMedial.tx},${VIEW_TY})`}>
              <g transform={mirrorTransform}>
                <path d={MEDIAL_SILHOUETTE} fill="#f3d9bb" stroke="#a97a4e" strokeWidth={1.5} />
                <path d={profundaFemD} fill={corStatusProfundo(p["Veia Femoral Profunda"])} pointerEvents="none" />
                {hitPath(profundaFemD, () => selecionar("profunda", "Veia Femoral Profunda"), "profunda:Veia Femoral Profunda", chaveAtiva, 8)}
                <path d={comumD} fill={corStatusProfundo(p["Veia Femoral Comum"])} pointerEvents="none" />
                {hitPath(comumD, () => selecionar("profunda", "Veia Femoral Comum"), "profunda:Veia Femoral Comum", chaveAtiva, 8)}
                <path d={superficialD} fill={corStatusProfundo(p["Veia Femoral Superficial"])} pointerEvents="none" />
                {hitPath(superficialD, () => selecionar("profunda", "Veia Femoral Superficial"), "profunda:Veia Femoral Superficial", chaveAtiva, 8)}
                {magnaResult.segments.map((seg, i) => (
                  <path key={i} d={seg.d} fill={seg.tracejado ? "none" : seg.color} stroke={seg.tracejado ? seg.color : "none"} strokeDasharray={seg.tracejado ? "5 5" : undefined} strokeWidth={seg.tracejado ? 2 : undefined} pointerEvents="none" />
                ))}
                {hitPath(magnaHitD, () => selecionar("superficial", "Safena Magna"), "superficial:Safena Magna", chaveAtiva)}
                <circle cx={150} cy={48} r={8} fill={jsfCor} stroke="#fff" strokeWidth={1.5} style={{ cursor: "pointer" }} onClick={() => selecionar("superficial", "JSF")} />
                {perfMarkers.map((mk, i) => (
                  <polygon key={i} points={trianguloPontos(mk.x, mk.y, PERFURANTE_TRIANGULO_RAIO)} fill={CORES["pérvia e incompetente"]} stroke="#fff" strokeWidth={1.3} strokeLinejoin="round" />
                ))}
                {VARIZ_SPOTS.filter((spot) => spot.view === "medial").map((spot) => {
                  const chave = `variz:${spot.regiao}`;
                  const ativo = chaveAtiva === chave;
                  return (
                    <g key={spot.regiao} style={{ cursor: "pointer" }} onClick={() => selecionar("variz", spot.regiao)}>
                      <VarizIcon tipo={vz[spot.regiao]} cx={spot.x} cy={spot.y} ativo={ativo} />
                    </g>
                  );
                })}
              </g>
              <text x={mx(70)} y={40} fontFamily="monospace" fontSize="9.5" fill="#1a2530" textAnchor={mirrored ? "end" : "start"}>JSF</text>
              <text x={mx(170)} y={95} fontFamily="monospace" fontSize="9.5" fill="#1a2530" textAnchor={mirrored ? "end" : "start"}>Femoral</text>
              <text x={mx(95)} y={200} fontFamily="monospace" fontSize="9.5" fill="#1a2530" textAnchor={mirrored ? "end" : "start"}>VSM</text>
              <text x={150} y={VIEW_H - VIEW_TY - 8} fontFamily="monospace" fontSize="13" textAnchor="middle" fill="#5c6b78">medial</text>
            </g>

            {/* POSTERIOR: JSP + Veia Poplítea + Safena Parva + panturrilha */}
            <g transform={`translate(${colPosterior.tx},${VIEW_TY})`}>
              <g transform={mirrorTransform}>
                <path d={POSTERIOR_SILHOUETTE} fill="#f3d9bb" stroke="#a97a4e" strokeWidth={1.5} />
                <path d={POPLITEA_RIBBON} fill={corStatusProfundo(p["Veia Poplítea"])} style={{ cursor: "pointer" }} onClick={() => selecionar("profunda", "Veia Poplítea")} opacity={chaveAtiva === "profunda:Veia Poplítea" ? 0.7 : 1} stroke={chaveAtiva === "profunda:Veia Poplítea" ? "#0eb8d0" : "none"} strokeWidth={2} />
                {parvaResult.segments.map((seg, i) => (
                  <path key={i} d={seg.d} fill={seg.tracejado ? "none" : seg.color} stroke={seg.tracejado ? seg.color : "none"} strokeDasharray={seg.tracejado ? "5 5" : undefined} strokeWidth={seg.tracejado ? 2 : undefined} pointerEvents="none" />
                ))}
                {hitPath(parvaHitD, () => selecionar("superficial", "Safena Parva"), "superficial:Safena Parva", chaveAtiva)}
                <circle cx={150} cy={314} r={8} fill={jspCor} stroke="#fff" strokeWidth={1.5} style={{ cursor: "pointer" }} onClick={() => selecionar("superficial", "JSP")} />
                {CALF_DOTS.map((dot) => {
                  const chave = `profunda:${dot.key}`;
                  const ativo = chaveAtiva === chave;
                  return (
                    <g key={dot.key} style={{ cursor: "pointer" }} onClick={() => selecionar("profunda", dot.key)}>
                      <circle cx={dot.x} cy={dot.y} r={7} fill={corStatusProfundo(p[dot.key])} stroke={ativo ? "#0eb8d0" : "#fff"} strokeWidth={ativo ? 2.5 : 1.5} />
                      <text x={dot.x} y={dot.y + 3} fontFamily="monospace" fontSize="7.5" fill="#fff" textAnchor="middle" pointerEvents="none" transform={mirrored ? `translate(${2 * dot.x},0) scale(-1,1)` : undefined}>{dot.label}</text>
                    </g>
                  );
                })}
                {VARIZ_SPOTS.filter((spot) => spot.view === "posterior").map((spot) => {
                  const chave = `variz:${spot.regiao}`;
                  const ativo = chaveAtiva === chave;
                  return (
                    <g key={spot.regiao} style={{ cursor: "pointer" }} onClick={() => selecionar("variz", spot.regiao)}>
                      <VarizIcon tipo={vz[spot.regiao]} cx={spot.x} cy={spot.y} ativo={ativo} />
                    </g>
                  );
                })}
              </g>
              <text x={mx(70)} y={310} fontFamily="monospace" fontSize="9.5" fill="#1a2530" textAnchor={mirrored ? "end" : "start"}>JSP</text>
              <text x={mx(165)} y={345} fontFamily="monospace" fontSize="9.5" fill="#1a2530" textAnchor={mirrored ? "end" : "start"}>V. Poplítea</text>
              <text x={mx(185)} y={430} fontFamily="monospace" fontSize="9.5" fill="#1a2530" textAnchor={mirrored ? "end" : "start"}>VSP</text>
              <text x={150} y={VIEW_H - VIEW_TY - 8} fontFamily="monospace" fontSize="13" textAnchor="middle" fill="#5c6b78">posterior</text>
            </g>
          </svg>
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 6, fontSize: 11, color: "#5c6b78", flexWrap: "wrap", justifyContent: "center" }}>
          <span>🔵 suficiente</span>
          <span>🔴 insuficiente</span>
          <span>⚫ trombose</span>
          <span>🟠 recanalização parcial</span>
          <span>⚪ ausente</span>
          <span style={{ marginLeft: 8, color: CORES["pérvia e incompetente"] }}>▲ perfurante insuficiente</span>
          <span style={{ marginLeft: 8 }}>Gc=Gastrocnêmicas · Ta=Tibiais Ant. · So=Soleares · Tp=Tibiais Post.</span>
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 4, fontSize: 11, color: "#5c6b78", flexWrap: "wrap", justifyContent: "center", alignItems: "center" }}>
          <span>Varizes (toque nos ícones tracejados na coxa/perna/tornozelo/pé):</span>
          <span style={{ color: VARIZ_CORES["Varizes Superficiais"] }}>〰️ superficiais</span>
          <span style={{ color: VARIZ_CORES["Varizes Reticulares"] }}>▦ reticulares</span>
          <span style={{ color: VARIZ_CORES["Microvarizes"] }}>✦ microvarizes</span>
        </div>

        {/* Painel contextual do vaso selecionado */}
        <div style={{ marginTop: 10, padding: "10px 12px", background: "#f0f4f7", borderRadius: 8, minHeight: 40 }}>
          {!selecionado && (
            <span style={{ color: "#5c6b78", fontSize: 13 }}>Toque em uma veia no desenho acima para registrar o achado.</span>
          )}
          {selecionado?.tipo === "profunda" && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <strong style={{ fontSize: 13 }}>{PROFUNDA_LABELS[selecionado.key]}:</strong>
              <select
                value={p[selecionado.key]}
                onChange={(e) => onProfundas(l, { ...p, [selecionado.key]: e.target.value })}
                style={{ padding: 4, borderRadius: 4, fontSize: 13 }}
              >
                {profOptions.map((opt) => <option key={opt}>{opt}</option>)}
              </select>
            </div>
          )}
          {selecionado?.tipo === "superficial" && (selecionado.key === "JSF" || selecionado.key === "JSP") && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <strong style={{ fontSize: 13 }}>{selecionado.key}:</strong>
              <select
                value={s[selecionado.key]}
                onChange={(e) => onSuperficiais(l, { ...s, [selecionado.key]: e.target.value })}
                style={{ padding: 4, borderRadius: 4, fontSize: 13 }}
              >
                {supOptions.map((opt) => <option key={opt}>{opt}</option>)}
              </select>
              <input
                type="number" min={0} step={0.1} placeholder="Diâmetro (mm)"
                value={(selecionado.key === "JSF" ? jsfDiametro?.[l] : jspDiametro?.[l]) || ""}
                onChange={(e) => (selecionado.key === "JSF" ? onJsfDiametro(l, e.target.value) : onJspDiametro(l, e.target.value))}
                style={{ width: 100, padding: 4, borderRadius: 4, border: "1px solid #0eb8d0", fontSize: 13 }}
              />
            </div>
          )}
          {selecionado?.tipo === "superficial" && selecionado.key === "Safena Magna" && (
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
                <strong style={{ fontSize: 13 }}>Safena Magna:</strong>
                <select
                  value={s["Safena Magna"]}
                  onChange={(e) => onSuperficiais(l, { ...s, "Safena Magna": e.target.value })}
                  style={{ padding: 4, borderRadius: 4, fontSize: 13 }}
                >
                  {supOptions.map((opt) => <option key={opt}>{opt}</option>)}
                </select>
              </div>
              <SafenaMagnaExtra status={s["Safena Magna"]} valores={m} onChange={(val) => onMagna(l, val)} />
            </div>
          )}
          {selecionado?.tipo === "superficial" && selecionado.key === "Safena Parva" && (
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
                <strong style={{ fontSize: 13 }}>Safena Parva:</strong>
                <select
                  value={s["Safena Parva"]}
                  onChange={(e) => onSuperficiais(l, { ...s, "Safena Parva": e.target.value })}
                  style={{ padding: 4, borderRadius: 4, fontSize: 13 }}
                >
                  {supOptions.map((opt) => <option key={opt}>{opt}</option>)}
                </select>
              </div>
              <SafenaParvaExtra status={s["Safena Parva"]} valores={pv} onChange={(val) => onParva(l, val)} />
            </div>
          )}
          {selecionado?.tipo === "variz" && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <strong style={{ fontSize: 13 }}>Varizes — {varizesRegiaoLabel[selecionado.key]}:</strong>
              <select
                value={vz[selecionado.key] || ""}
                onChange={(e) => onVarizes(l, { ...vz, [selecionado.key]: e.target.value })}
                style={{ padding: 4, borderRadius: 4, fontSize: 13 }}
              >
                <option value="">Nenhuma</option>
                {varizesTipoOptions.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>
          )}
        </div>

        {/* Veias perfurantes: lista compacta (mesmos campos do formulário) */}
        <div style={{ marginTop: 10 }}>
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>Veias Perfurantes ({l}):</div>
          {perfs.map((perf, idx) => (
            <div key={idx} style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 4 }}>
              <select
                value={perf.status}
                onChange={(e) => {
                  const novoStatus = e.target.value;
                  const novo = perfs.map((pf, i) => i === idx ? (
                    novoStatus === "pérvia e incompetente" ? { ...pf, status: novoStatus } : { ...pf, status: novoStatus, segmento: "", valor: "" }
                  ) : pf);
                  onPerfurantes(l, novo);
                }}
                style={{ padding: 4, borderRadius: 4, fontSize: 12 }}
              >
                {perfurantesStatusOptions.map((opt) => <option key={opt}>{opt}</option>)}
              </select>
              {perf.status === "pérvia e incompetente" && (
                <>
                  <select
                    value={perf.segmento}
                    onChange={(e) => onPerfurantes(l, perfs.map((pf, i) => i === idx ? { ...pf, segmento: e.target.value, valor: "" } : pf))}
                    style={{ padding: 4, borderRadius: 4, fontSize: 12 }}
                  >
                    <option value="">Selecione o segmento</option>
                    {perfurantesSegmentoOptions.map((opt) => <option key={opt}>{opt}</option>)}
                  </select>
                  {perf.segmento && (
                    <input
                      type="number" min={0} step={0.1} placeholder="cm" value={perf.valor}
                      onChange={(e) => onPerfurantes(l, perfs.map((pf, i) => i === idx ? { ...pf, valor: e.target.value } : pf))}
                      style={{ width: 60, padding: 4, borderRadius: 4, border: "1px solid #0eb8d0", fontSize: 12 }}
                    />
                  )}
                </>
              )}
              {perfs.length > 1 && (
                <button type="button" onClick={() => onPerfurantes(l, perfs.filter((_, i) => i !== idx))} style={{ padding: "3px 8px", borderRadius: 4, border: "none", background: "#c0392b", color: "#fff", fontSize: 12, cursor: "pointer" }}>Remover</button>
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={() => onPerfurantes(l, [...perfs, { status: "pérvia e competente", segmento: "", valor: "" }])}
            style={{ padding: "4px 10px", borderRadius: 4, border: "1.5px solid #0eb8d0", background: "transparent", color: "#0eb8d0", fontWeight: 600, fontSize: 12, cursor: "pointer" }}
          >+ Adicionar perfurante</button>
        </div>

        {/* Observações do membro ativo — mesmo campo do formulário escrito.
            Preenchido aqui, aparece também no Mapeamento Venoso e no PDF. */}
        <div style={{ marginTop: 12 }}>
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>Observações ({l}):</div>
          <textarea
            value={observacoes?.[l] || ""}
            onChange={(e) => onObservacao(l, e.target.value)}
            placeholder={`Digite observações adicionais do exame do membro ${l.toLowerCase()}...`}
            style={{
              width: "100%",
              minHeight: 50,
              fontSize: 12,
              borderRadius: 6,
              border: "1.5px solid #0eb8d0",
              padding: 8,
              resize: "vertical",
              boxSizing: "border-box",
            }}
          />
        </div>

        {/* Anexos: mesmas imagens (PNG/JPG) que o formulário principal anexa ao PDF */}
        <div style={{ marginTop: 12 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
            <div style={{ fontWeight: 700, fontSize: 13 }}>📎 Anexos:</div>
            <span style={{ fontSize: 11, color: "#5c6b78" }}>{anexos.length} arquivo(s)</span>
          </div>
          <div
            onDrop={onDrop}
            onDragOver={onDragOver}
            onClick={() => document.getElementById('fileInputMapa').click()}
            style={{
              border: "1px dashed #0eb8d0", borderRadius: 6, padding: 10, textAlign: "center",
              background: "rgba(14,184,208,0.05)", cursor: "pointer", fontSize: 12, color: "#0eb8d0",
            }}
          >
            <input id="fileInputMapa" type="file" accept=".png,.jpg,.jpeg" multiple onChange={onFileUpload} style={{ display: "none" }} />
            Clique ou arraste para anexar (PNG/JPG até 15MB)
          </div>
          {anexos.length > 0 && (
            <div style={{ maxHeight: 120, overflowY: "auto", border: "1px solid #dfe6ec", borderRadius: 6, background: "#f7f9fa", padding: 6, marginTop: 6 }}>
              {anexos.map((anexo) => (
                <div key={anexo.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: 4, background: "#fff", borderRadius: 4, marginBottom: 4, border: "1px solid #dfe6ec" }}>
                  <img src={anexo.thumbnail} alt={anexo.name} style={{ width: 32, height: 32, objectFit: "cover", borderRadius: 3, border: "1px solid #dfe6ec" }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{anexo.name}</div>
                    <div style={{ fontSize: 10, color: "#5c6b78" }}>{formatFileSize(anexo.size)}</div>
                  </div>
                  <button onClick={() => onRemoveAnexo(anexo.id)} style={{ background: "#c0392b", color: "#fff", border: "none", borderRadius: 4, padding: "3px 8px", fontSize: 11, cursor: "pointer" }}>✕</button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Laudo ao vivo */}
        <div style={{ marginTop: 12 }}>
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>Laudo ({l}) — atualizado em tempo real:</div>
          <pre style={{
            background: "#f7f9fa", border: "1px solid #dfe6ec", borderRadius: 8, padding: 10,
            fontSize: 11.5, whiteSpace: "pre-wrap", maxHeight: 260, overflowY: "auto", margin: 0,
          }}>
            {montarLaudo({ nome, data, lado: l, profundas, superficiais, magna, parva, jsfDiametro, jspDiametro, observacoes, perfurantes, varizes })}
          </pre>
        </div>

        {/* Salvar direto daqui, sem precisar fechar o mapa e voltar ao
            formulário. Salva o exame completo (os dois lados, se "Ambos"),
            não só o lado ativo no mapa. */}
        <label style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4, marginTop: 12, fontSize: 12, color: "#333", cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={incluirMapeamentoVisualPdf}
            onChange={(e) => onIncluirMapeamentoVisualPdf(e.target.checked)}
          />
          Incluir Mapeamento Visual no PDF
        </label>
        <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap", justifyContent: "center" }}>
          <button onClick={onAbrirMapeamentoVisual} style={mapaBotaoStyle("#6f42c1")}>🩺 Mapeamento Visual</button>
          <button onClick={onSalvarTXT} style={mapaBotaoStyle("#0eb8d0")}>Salvar TXT</button>
          <button onClick={onSalvarPDF} style={mapaBotaoStyle("#0eb8d0")}>Salvar PDF</button>
          <button onClick={() => {
            if (!nome || !data) { alert("Preencha nome e data no formulário antes de salvar o exame!"); return; }
            onSalvarExame();
          }} style={mapaBotaoStyle("#28a745")}>Salvar Exame</button>
        </div>
      </div>
    </div>
  );
}
