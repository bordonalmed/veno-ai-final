import React, { useState } from "react";
import { FiPaperclip, FiX } from "react-icons/fi";
import MapaLayout from "./MapaLayout";
import {
  MEDIAL_SILHOUETTE,
  POSTERIOR_SILHOUETTE,
  POPLITEA_RIBBON,
  VSM_SPINE, VSM_HALF,
  VSP_SPINE, VSP_HALF,
  LANDMARK_MAGNA, LANDMARK_PARVA,
  FEMORAL_TRUNK_SPINE, FEMORAL_TRUNK_HALF, FEMORAL_COMUM_FIM, FEMORAL_COMUM_TOPO,
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
  { key: "medial", label: "medial", tx: -68 },
  { key: "posterior", label: "posterior", tx: COL_WIDTH - 75 },
];
const VIEW_TY = 16;
export const VIEW_W = COL_WIDTH * 2;
export const VIEW_H = 660;

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
  { key: "Veias Gastrocnêmicas", label: "Gc", x: 177, y: 402 },
  { key: "Veias Tibiais anteriores", label: "Ta", x: 157, y: 402 },
  { key: "Veias Soleares", label: "So", x: 177, y: 428 },
  { key: "Veias Tibiais posteriores", label: "Tp", x: 157, y: 428 },
];

// Cores próprias para os "adesivos" de variz, fora da paleta de status dos
// vasos (azul suficiente, vermelho insuficiente, preto, laranja, cinza) pra
// não confundir: variz não é achado de status de veia, é achado de pele.
export const VARIZ_CORES = {
  "Varizes Superficiais": "#6f42c1",
  "Varizes Reticulares": "#138d75",
  "Microvarizes": "#d63384",
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

// O mesmo ícone do desenho, em tamanho de legenda.
export function VarizLegendaIcone({ tipo }) {
  return (
    <svg width={10} height={22} viewBox="-9.5 -21.5 19 43" style={{ verticalAlign: "middle", flexShrink: 0 }} aria-hidden="true">
      <VarizIcon tipo={tipo} cx={0} cy={0} ativo={false} />
    </svg>
  );
}

// Posições fixas dos 4 marcadores de variz (coxa/perna/tornozelo/pé), recentradas
// na faixa livre entre o contorno da perna e a Safena Magna (verificado
// programaticamente, com folga) pra caber o ícone maior definido acima. O
// pé fica na vista posterior, abaixo do tornozelo, onde o desenho já alarga
// bastante (bem mais espaço ali do que perto do tornozelo).
export const VARIZ_SPOTS = [
  { regiao: "coxa", view: "medial", x: 159, y: 150 },
  { regiao: "perna", view: "medial", x: 171, y: 420 },
  { regiao: "tornozelo", view: "posterior", x: 156, y: 540 },
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

// Desenho das duas vistas (anterior + posterior) de UM membro. O Mapa Interativo
// usa com onSelecionar (clicável); o Mapeamento Visual e o PDF usam sem ele
// (estático) — é o mesmo desenho, então o PDF impresso sai igual ao Mapa Interativo.
export function DesenhoMMIIVenoso({
  lado, profundas, superficiais, magna, parva, perfurantes, varizes,
  onSelecionar, chaveAtiva = null, width = "100%", height, style,
}) {
  const l = lado;
  const p = profundas || {};
  const s = superficiais || {};
  const m = magna || {};
  const pv = parva || {};
  const perfs = Array.isArray(perfurantes) ? perfurantes : [];
  const vz = varizes || {};
  const interativo = typeof onSelecionar === "function";
  const selecionar = (tipo, key) => { if (interativo) onSelecionar(tipo, key); };
  const clicavel = interativo ? { cursor: "pointer" } : undefined;

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

  const comumD = fitaVeiaSimples(FEMORAL_TRUNK_SPINE, FEMORAL_TRUNK_HALF, FEMORAL_COMUM_TOPO, FEMORAL_COMUM_FIM);
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
    <svg xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} width={width} height={height} style={style}>
      {/* MEDIAL: JSF + Safena Magna + Femoral Comum/Superficial/Profunda + perfurantes */}
      <g transform={`translate(${colMedial.tx},${VIEW_TY})`}>
        <g transform={mirrorTransform}>
          <path d={MEDIAL_SILHOUETTE} fill="#f3d9bb" stroke="#a97a4e" strokeWidth={1.5} />
          <path d={profundaFemD} fill={corStatusProfundo(p["Veia Femoral Profunda"])} pointerEvents="none" />
          {interativo && hitPath(profundaFemD, () => selecionar("profunda", "Veia Femoral Profunda"), "profunda:Veia Femoral Profunda", chaveAtiva, 8)}
          <path d={comumD} fill={corStatusProfundo(p["Veia Femoral Comum"])} pointerEvents="none" />
          {interativo && hitPath(comumD, () => selecionar("profunda", "Veia Femoral Comum"), "profunda:Veia Femoral Comum", chaveAtiva, 8)}
          <path d={superficialD} fill={corStatusProfundo(p["Veia Femoral Superficial"])} pointerEvents="none" />
          {interativo && hitPath(superficialD, () => selecionar("profunda", "Veia Femoral Superficial"), "profunda:Veia Femoral Superficial", chaveAtiva, 8)}
          {magnaResult.segments.map((seg, i) => (
            <path key={i} d={seg.d} fill={seg.tracejado ? "none" : seg.color} stroke={seg.tracejado ? seg.color : "none"} strokeDasharray={seg.tracejado ? "5 5" : undefined} strokeWidth={seg.tracejado ? 2 : undefined} pointerEvents="none" />
          ))}
          {interativo && hitPath(magnaHitD, () => selecionar("superficial", "Safena Magna"), "superficial:Safena Magna", chaveAtiva)}
          <circle cx={VSM_SPINE[0][0]} cy={VSM_SPINE[0][1]} r={8} fill={jsfCor} stroke="#fff" strokeWidth={1.5} style={clicavel} onClick={() => selecionar("superficial", "JSF")} />
          {perfMarkers.map((mk, i) => (
            <polygon key={i} points={trianguloPontos(mk.x, mk.y, PERFURANTE_TRIANGULO_RAIO)} fill={CORES["pérvia e incompetente"]} stroke="#fff" strokeWidth={1.3} strokeLinejoin="round" />
          ))}
          {VARIZ_SPOTS.filter((spot) => spot.view === "medial" && (interativo || vz[spot.regiao])).map((spot) => {
            const chave = `variz:${spot.regiao}`;
            const ativo = chaveAtiva === chave;
            return (
              <g key={spot.regiao} style={clicavel} onClick={() => selecionar("variz", spot.regiao)}>
                <VarizIcon tipo={vz[spot.regiao]} cx={spot.x} cy={spot.y} ativo={ativo} />
              </g>
            );
          })}
        </g>
        <text x={mx(212.7)} y={40} fontFamily="monospace" fontSize="9.5" fill="#1a2530" textAnchor={mirrored ? "start" : "end"}>JSF</text>
        <text x={mx(111)} y={95} fontFamily="monospace" fontSize="9.5" fill="#1a2530" textAnchor={mirrored ? "start" : "end"}>Femoral</text>
        <text x={mx(187)} y={200} fontFamily="monospace" fontSize="9.5" fill="#1a2530" textAnchor={mirrored ? "start" : "end"}>VSM</text>
        <text x={150} y={VIEW_H - VIEW_TY - 8} fontFamily="monospace" fontSize="13" textAnchor="middle" fill="#5c6b78">anterior</text>
      </g>

      {/* POSTERIOR: JSP + Veia Poplítea + Safena Parva + panturrilha */}
      <g transform={`translate(${colPosterior.tx},${VIEW_TY})`}>
        <g transform={mirrorTransform}>
          <path d={POSTERIOR_SILHOUETTE} fill="#f3d9bb" stroke="#a97a4e" strokeWidth={1.5} />
          <path d={POPLITEA_RIBBON} fill={corStatusProfundo(p["Veia Poplítea"])} style={clicavel} onClick={() => selecionar("profunda", "Veia Poplítea")} opacity={chaveAtiva === "profunda:Veia Poplítea" ? 0.7 : 1} stroke={chaveAtiva === "profunda:Veia Poplítea" ? "#0eb8d0" : "none"} strokeWidth={2} />
          {parvaResult.segments.map((seg, i) => (
            <path key={i} d={seg.d} fill={seg.tracejado ? "none" : seg.color} stroke={seg.tracejado ? seg.color : "none"} strokeDasharray={seg.tracejado ? "5 5" : undefined} strokeWidth={seg.tracejado ? 2 : undefined} pointerEvents="none" />
          ))}
          {interativo && hitPath(parvaHitD, () => selecionar("superficial", "Safena Parva"), "superficial:Safena Parva", chaveAtiva)}
          <circle cx={150} cy={314} r={8} fill={jspCor} stroke="#fff" strokeWidth={1.5} style={clicavel} onClick={() => selecionar("superficial", "JSP")} />
          {CALF_DOTS.map((dot) => {
            const chave = `profunda:${dot.key}`;
            const ativo = chaveAtiva === chave;
            return (
              <g key={dot.key} style={clicavel} onClick={() => selecionar("profunda", dot.key)}>
                <circle cx={dot.x} cy={dot.y} r={7} fill={corStatusProfundo(p[dot.key])} stroke={ativo ? "#0eb8d0" : "#fff"} strokeWidth={ativo ? 2.5 : 1.5} />
                <text x={dot.x} y={dot.y + 3} fontFamily="monospace" fontSize="7.5" fill="#fff" textAnchor="middle" pointerEvents="none" transform={mirrored ? `translate(${2 * dot.x},0) scale(-1,1)` : undefined}>{dot.label}</text>
              </g>
            );
          })}
          {VARIZ_SPOTS.filter((spot) => spot.view === "posterior" && (interativo || vz[spot.regiao])).map((spot) => {
            const chave = `variz:${spot.regiao}`;
            const ativo = chaveAtiva === chave;
            return (
              <g key={spot.regiao} style={clicavel} onClick={() => selecionar("variz", spot.regiao)}>
                <VarizIcon tipo={vz[spot.regiao]} cx={spot.x} cy={spot.y} ativo={ativo} />
              </g>
            );
          })}
        </g>
        <text x={mx(230)} y={310} fontFamily="monospace" fontSize="9.5" fill="#1a2530" textAnchor={mirrored ? "start" : "end"}>JSP</text>
        <text x={mx(135)} y={345} fontFamily="monospace" fontSize="9.5" fill="#1a2530" textAnchor={mirrored ? "start" : "end"}>V. Poplítea</text>
        <text x={mx(115)} y={430} fontFamily="monospace" fontSize="9.5" fill="#1a2530" textAnchor={mirrored ? "start" : "end"}>VSP</text>
        <text x={150} y={VIEW_H - VIEW_TY - 8} fontFamily="monospace" fontSize="13" textAnchor="middle" fill="#5c6b78">posterior</text>
      </g>
    </svg>
  );
}

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


  const selectStyle = { padding: "8px 10px", borderRadius: 6, fontSize: 14, border: "1.5px solid #0eb8d0", background: "#f7fbff", color: "#222", maxWidth: "100%" };
  const linhaCampo = { display: "flex", flexDirection: "column", gap: 4, marginBottom: 8 };
  const rotulo = { fontSize: 12, fontWeight: 700, color: "#0a7f91" };

  let tituloPainel = "";
  let painel = null;
  if (selecionado?.tipo === "profunda") {
    tituloPainel = PROFUNDA_LABELS[selecionado.key];
    painel = (
      <div style={linhaCampo}>
        <span style={rotulo}>Achado:</span>
        <select value={p[selecionado.key]} onChange={(e) => onProfundas(l, { ...p, [selecionado.key]: e.target.value })} style={selectStyle}>
          {profOptions.map((opt) => <option key={opt}>{opt}</option>)}
        </select>
      </div>
    );
  } else if (selecionado?.tipo === "superficial" && (selecionado.key === "JSF" || selecionado.key === "JSP")) {
    tituloPainel = selecionado.key === "JSF" ? "Junção safeno-femoral (JSF)" : "Junção safeno-poplítea (JSP)";
    painel = (
      <>
        <div style={linhaCampo}>
          <span style={rotulo}>Achado:</span>
          <select value={s[selecionado.key]} onChange={(e) => onSuperficiais(l, { ...s, [selecionado.key]: e.target.value })} style={selectStyle}>
            {supOptions.map((opt) => <option key={opt}>{opt}</option>)}
          </select>
        </div>
        <div style={linhaCampo}>
          <span style={rotulo}>Diâmetro (mm):</span>
          <input
            type="number" min={0} step={0.1} placeholder="mm"
            value={(selecionado.key === "JSF" ? jsfDiametro?.[l] : jspDiametro?.[l]) || ""}
            onChange={(e) => (selecionado.key === "JSF" ? onJsfDiametro(l, e.target.value) : onJspDiametro(l, e.target.value))}
            style={{ ...selectStyle, width: 140 }}
          />
        </div>
      </>
    );
  } else if (selecionado?.tipo === "superficial" && selecionado.key === "Safena Magna") {
    tituloPainel = "Safena Magna";
    painel = (
      <>
        <div style={linhaCampo}>
          <span style={rotulo}>Achado:</span>
          <select value={s["Safena Magna"]} onChange={(e) => onSuperficiais(l, { ...s, "Safena Magna": e.target.value })} style={selectStyle}>
            {supOptions.map((opt) => <option key={opt}>{opt}</option>)}
          </select>
        </div>
        <SafenaMagnaExtra status={s["Safena Magna"]} valores={m} onChange={(val) => onMagna(l, val)} />
      </>
    );
  } else if (selecionado?.tipo === "superficial" && selecionado.key === "Safena Parva") {
    tituloPainel = "Safena Parva";
    painel = (
      <>
        <div style={linhaCampo}>
          <span style={rotulo}>Achado:</span>
          <select value={s["Safena Parva"]} onChange={(e) => onSuperficiais(l, { ...s, "Safena Parva": e.target.value })} style={selectStyle}>
            {supOptions.map((opt) => <option key={opt}>{opt}</option>)}
          </select>
        </div>
        <SafenaParvaExtra status={s["Safena Parva"]} valores={pv} onChange={(val) => onParva(l, val)} />
      </>
    );
  } else if (selecionado?.tipo === "variz") {
    tituloPainel = `Varizes — ${varizesRegiaoLabel[selecionado.key]}`;
    painel = (
      <div style={linhaCampo}>
        <span style={rotulo}>Tipo:</span>
        <select value={vz[selecionado.key] || ""} onChange={(e) => onVarizes(l, { ...vz, [selecionado.key]: e.target.value })} style={selectStyle}>
          <option value="">Nenhuma</option>
          {varizesTipoOptions.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
        </select>
      </div>
    );
  }

  // ● (círculo geométrico comum) em vez de emoji de bolinha colorida: emoji de
  // cor ignora o "color" do CSS e depende da fonte de emoji do sistema.
  const legenda = (
    <>
      <div style={{ display: "flex", gap: 8, fontSize: 11, color: "#5c6b78", flexWrap: "wrap", justifyContent: "center" }}>
        <span style={{ color: CORES["pérvia e competente"] }}>● suficiente</span>
        <span style={{ color: CORES["pérvia e incompetente"] }}>● insuficiente</span>
        <span style={{ color: CORES["não compressível e sem fluxo (trombose)"] }}>● trombose</span>
        <span style={{ color: CORES["recanalização parcial"] }}>● recanalização parcial</span>
        <span style={{ color: CORES["ausente"] }}>● ausente</span>
        <span style={{ color: CORES["pérvia e incompetente"] }}>▲ perfurante insuficiente</span>
        <span>Gc=Gastrocnêmicas · Ta=Tibiais Ant. · So=Soleares · Tp=Tibiais Post.</span>
      </div>
      <div style={{ display: "flex", gap: 10, marginTop: 4, fontSize: 11, color: "#5c6b78", flexWrap: "wrap", justifyContent: "center", alignItems: "center" }}>
        <span>Varizes (toque nos ícones tracejados):</span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: VARIZ_CORES["Varizes Superficiais"] }}><VarizLegendaIcone tipo="Varizes Superficiais" /> superficiais</span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: VARIZ_CORES["Varizes Reticulares"] }}><VarizLegendaIcone tipo="Varizes Reticulares" /> reticulares</span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: VARIZ_CORES["Microvarizes"] }}><VarizLegendaIcone tipo="Microvarizes" /> microvarizes</span>
      </div>
    </>
  );

  const conteudo = (
    <>
      {/* Veias perfurantes: lista compacta (mesmos campos do formulário) */}
      <div>
        <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>Veias Perfurantes ({l}):</div>
        {perfs.map((perf, idx) => (
          <div key={idx} style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 6 }}>
            <select
              value={perf.status}
              onChange={(e) => {
                const novoStatus = e.target.value;
                const novo = perfs.map((pf, i) => i === idx ? (
                  novoStatus === "pérvia e incompetente" ? { ...pf, status: novoStatus } : { ...pf, status: novoStatus, segmento: "", valor: "" }
                ) : pf);
                onPerfurantes(l, novo);
              }}
              style={{ ...selectStyle, fontSize: 13, padding: 6 }}
            >
              {perfurantesStatusOptions.map((opt) => <option key={opt}>{opt}</option>)}
            </select>
            {perf.status === "pérvia e incompetente" && (
              <>
                <select
                  value={perf.segmento}
                  onChange={(e) => onPerfurantes(l, perfs.map((pf, i) => i === idx ? { ...pf, segmento: e.target.value, valor: "" } : pf))}
                  style={{ ...selectStyle, fontSize: 13, padding: 6 }}
                >
                  <option value="">Selecione o segmento</option>
                  {perfurantesSegmentoOptions.map((opt) => <option key={opt}>{opt}</option>)}
                </select>
                {perf.segmento && (
                  <input
                    type="number" min={0} step={0.1} placeholder="cm" value={perf.valor}
                    onChange={(e) => onPerfurantes(l, perfs.map((pf, i) => i === idx ? { ...pf, valor: e.target.value } : pf))}
                    style={{ ...selectStyle, fontSize: 13, padding: 6, width: 70 }}
                  />
                )}
              </>
            )}
            {perfs.length > 1 && (
              <button type="button" onClick={() => onPerfurantes(l, perfs.filter((_, i) => i !== idx))} style={{ padding: "5px 10px", borderRadius: 4, border: "none", background: "#c0392b", color: "#fff", fontSize: 12, cursor: "pointer" }}>Remover</button>
            )}
          </div>
        ))}
        <button
          type="button"
          onClick={() => onPerfurantes(l, [...perfs, { status: "pérvia e competente", segmento: "", valor: "" }])}
          style={{ padding: "6px 12px", borderRadius: 4, border: "1.5px solid #0eb8d0", background: "transparent", color: "#0a7f91", fontWeight: 600, fontSize: 12, cursor: "pointer" }}
        >+ Adicionar perfurante</button>
      </div>

      {/* Observações do membro ativo — mesmo campo do formulário escrito. */}
      <div>
        <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>Observações ({l}):</div>
        <textarea
          value={observacoes?.[l] || ""}
          onChange={(e) => onObservacao(l, e.target.value)}
          placeholder={`Digite observações adicionais do exame do membro ${l.toLowerCase()}...`}
          style={{ width: "100%", minHeight: 50, fontSize: 13, borderRadius: 6, border: "1.5px solid #0eb8d0", padding: 8, resize: "vertical", boxSizing: "border-box" }}
        />
      </div>

      {/* Anexos: mesmas imagens (PNG/JPG) que o formulário principal anexa ao PDF */}
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
          <div style={{ fontWeight: 700, fontSize: 13, display: "inline-flex", alignItems: "center", gap: 5 }}><FiPaperclip /> Anexos:</div>
          <span style={{ fontSize: 11, color: "#5c6b78" }}>{anexos.length} arquivo(s)</span>
        </div>
        <div
          onDrop={onDrop}
          onDragOver={onDragOver}
          onClick={() => document.getElementById('fileInputMapa').click()}
          style={{ border: "1px dashed #0eb8d0", borderRadius: 6, padding: 10, textAlign: "center", background: "rgba(14,184,208,0.05)", cursor: "pointer", fontSize: 12, color: "#0a7f91" }}
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
                <button onClick={() => onRemoveAnexo(anexo.id)} style={{ background: "#c0392b", color: "#fff", border: "none", borderRadius: 4, padding: "3px 8px", fontSize: 11, cursor: "pointer", display: "inline-flex", alignItems: "center" }}><FiX /></button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Laudo ao vivo */}
      <div>
        <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>Laudo ({l}) — atualizado em tempo real:</div>
        <pre style={{ background: "#f7f9fa", border: "1px solid #dfe6ec", borderRadius: 8, padding: 10, fontSize: 11.5, whiteSpace: "pre-wrap", maxHeight: 320, overflowY: "auto", margin: 0 }}>
          {montarLaudo({ nome, data, lado: l, profundas, superficiais, magna, parva, jsfDiametro, jspDiametro, observacoes, perfurantes, varizes })}
        </pre>
      </div>
    </>
  );

  return (
    <MapaLayout
      titulo={`Mapa Interativo — Sistema Venoso (${l})`}
      subtitulo="Toque numa veia do desenho para marcar o achado. O laudo é atualizado em tempo real."
      onFechar={onFechar}
      lado={lado}
      ladoAtivo={ladoAtivo}
      onTrocarLado={(op) => { onTrocarLado(op); setSelecionado(null); }}
      desenho={
        <DesenhoMMIIVenoso
          lado={l} profundas={p} superficiais={s} magna={m} parva={pv} perfurantes={perfs} varizes={vz}
          onSelecionar={selecionar} chaveAtiva={chaveAtiva}
          style={{ width: "100%", maxWidth: 560, maxHeight: "74vh", display: "block" }}
        />
      }
      legenda={legenda}
      painel={painel}
      tituloPainel={`${tituloPainel} (${l})`}
      onFecharPainel={() => setSelecionado(null)}
      placeholderPainel="Toque em uma veia no desenho para registrar o achado."
      conteudo={conteudo}
      incluirPdf={incluirMapeamentoVisualPdf}
      onIncluirPdf={onIncluirMapeamentoVisualPdf}
      labelIncluirPdf="Incluir Mapeamento Visual no PDF"
      onVisualizarImagem={onAbrirMapeamentoVisual}
      onSalvarTXT={onSalvarTXT}
      onSalvarPDF={onSalvarPDF}
      onSalvarExame={() => {
        if (!nome || !data) { alert("Preencha nome e data no formulário antes de salvar o exame!"); return; }
        onSalvarExame();
      }}
    />
  );
}
