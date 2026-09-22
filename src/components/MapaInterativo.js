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
  TIBIAL_POSTERIOR_SPINE, TIBIAL_POSTERIOR_HALF,
  TIBIAL_ANTERIOR_SPINE, TIBIAL_ANTERIOR_HALF,
  GASTROCNEMICA_SPINE, GASTROCNEMICA_HALF,
  SOLEAR_SPINE, SOLEAR_HALF,
  CORES,
  construirSegmentosVeia,
  corStatusProfundo,
  linhaVeiaSimples,
  posicaoPerfurante,
  PX_PER_CM,
} from "../utils/vascularMapping";
import { SafenaMagnaExtra, SafenaParvaExtra } from "./SafenaExtraFields";
import {
  profOptions, supOptions, perfurantesStatusOptions, perfurantesSegmentoOptions,
  montarLaudo,
} from "../utils/mmiiVenosoLaudo";

// Layout do SVG: régua esquerda + 4 colunas (anterior/medial/posterior/lateral)
// + régua direita. Cada coluna usa o MESMO sistema de coordenadas local das
// silhuetas já existentes (x ~105-190, y ~8-622) — só muda o "tx" de cada uma.
const COL_WIDTH = 260;
const RULER_WIDTH = 55;
const COLS = [
  { key: "anterior", label: "anterior", tx: RULER_WIDTH - 65 },
  { key: "medial", label: "medial", tx: RULER_WIDTH + COL_WIDTH - 65 },
  { key: "posterior", label: "posterior", tx: RULER_WIDTH + COL_WIDTH * 2 - 65 },
  { key: "lateral", label: "lateral", tx: RULER_WIDTH + COL_WIDTH * 3 - 65 },
];
const VIEW_TY = 20;
const VIEW_W = RULER_WIDTH * 2 + COL_WIDTH * 4;
const VIEW_H = 700;
const JOELHO_Y = LANDMARK_MAGNA.joelho; // referência "0" da régua

function hitPath(d, onClick, key, selecionado) {
  const ativo = selecionado === key;
  return (
    <path
      d={d}
      fill="none"
      stroke={ativo ? "#0eb8d0" : "#000"}
      strokeOpacity={ativo ? 0.35 : 0.001}
      strokeWidth={ativo ? 14 : 16}
      strokeLinecap="round"
      style={{ cursor: "pointer" }}
      onClick={onClick}
    />
  );
}

function Regua({ mirror }) {
  const ticks = [];
  for (let n = -45; n <= 45; n += 5) {
    const yLocal = JOELHO_Y - n * PX_PER_CM;
    if (yLocal < 12 || yLocal > VIEW_H - VIEW_TY - 15) continue;
    const y = yLocal + VIEW_TY;
    const label = n === 0 ? "0" : String(Math.abs(n));
    ticks.push(
      <g key={n}>
        <line x1={mirror ? 0 : 8} y1={y} x2={mirror ? RULER_WIDTH - 8 : RULER_WIDTH} y2={y} stroke="#7a8a99" strokeWidth={n === 0 ? 2 : 1} />
        <text x={mirror ? 6 : RULER_WIDTH - 6} y={y + 3} fontFamily="monospace" fontSize="9" fill="#5c6b78" textAnchor={mirror ? "start" : "end"}>{label}</text>
      </g>
    );
  }
  return (
    <g>
      <text x={mirror ? 4 : RULER_WIDTH - 4} y={14} fontFamily="monospace" fontSize="9" fill="#5c6b78" textAnchor={mirror ? "start" : "end"}>cm</text>
      <text x={mirror ? 4 : RULER_WIDTH - 4} y={VIEW_H - 8} fontFamily="monospace" fontSize="9" fill="#5c6b78" textAnchor={mirror ? "start" : "end"}>cm</text>
      {ticks}
    </g>
  );
}

function Gridlines() {
  const lines = [];
  for (let n = -45; n <= 45; n += 5) {
    const yLocal = JOELHO_Y - n * PX_PER_CM;
    if (yLocal < 12 || yLocal > VIEW_H - VIEW_TY - 15) continue;
    const y = yLocal + VIEW_TY;
    lines.push(<line key={n} x1={RULER_WIDTH} y1={y} x2={VIEW_W - RULER_WIDTH} y2={y} stroke="#dfe6ec" strokeWidth={n === 0 ? 1.4 : 0.7} />);
  }
  return <g>{lines}</g>;
}

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
  onJsfDiametro, onJspDiametro,
}) {
  const [selecionado, setSelecionado] = useState(null);

  if (!aberto) return null;

  const l = ladoAtivo;
  const p = profundas?.[l] || {};
  const s = superficiais?.[l] || {};
  const m = magna?.[l] || {};
  const pv = parva?.[l] || {};
  const perfs = Array.isArray(perfurantes?.[l]) ? perfurantes[l] : [];

  function selecionar(tipo, key) {
    setSelecionado({ tipo, key });
  }
  const chaveAtiva = selecionado ? `${selecionado.tipo}:${selecionado.key}` : null;

  // ---- Vista ANTERIOR: Femoral Comum + Superficial + Profunda ----
  const comumD = linhaVeiaSimples(FEMORAL_TRUNK_SPINE, FEMORAL_TRUNK_HALF, LANDMARK_MAGNA.top, FEMORAL_COMUM_FIM);
  const superficialD = linhaVeiaSimples(FEMORAL_TRUNK_SPINE, FEMORAL_TRUNK_HALF, FEMORAL_COMUM_FIM, LANDMARK_MAGNA.joelho);
  const profundaFemD = linhaVeiaSimples(FEMORAL_PROFUNDA_SPINE, FEMORAL_PROFUNDA_HALF, FEMORAL_PROFUNDA_SPINE[0][1], FEMORAL_PROFUNDA_SPINE[FEMORAL_PROFUNDA_SPINE.length - 1][1]);

  // ---- Vista MEDIAL: JSF + Safena Magna ----
  const magnaResult = construirSegmentosVeia({
    spine: VSM_SPINE, half: VSM_HALF, landmark: LANDMARK_MAGNA,
    status: s["Safena Magna"], ini: m.inicio, fim: m.fim, iniVal: m.inicio_valor, fimVal: m.fim_valor,
  });
  const magnaHitD = linhaVeiaSimples(VSM_SPINE, VSM_HALF, LANDMARK_MAGNA.top, LANDMARK_MAGNA.tornozelo);
  const jsfCor = CORES[s["JSF"]] || CORES["pérvia e competente"];

  // ---- Vista POSTERIOR: JSP + Veia Poplítea + Safena Parva ----
  const parvaResult = construirSegmentosVeia({
    spine: VSP_SPINE, half: VSP_HALF, landmark: LANDMARK_PARVA,
    status: s["Safena Parva"], ini: pv.inicio, fim: pv.fim, iniVal: pv.inicio_valor, fimVal: pv.fim_valor,
  });
  // Área de clique começa abaixo da faixa da Veia Poplítea (POPLITEA_RIBBON vai
  // até y~388), para não roubar o clique destinado a ela logo abaixo do JSP.
  const parvaHitD = linhaVeiaSimples(VSP_SPINE, VSP_HALF, 382, LANDMARK_PARVA.tornozelo);
  const jspCor = CORES[s["JSP"]] || CORES["pérvia e competente"];

  // ---- Vista LATERAL: leque de veias profundas da panturrilha ----
  const tibialPostD = linhaVeiaSimples(TIBIAL_POSTERIOR_SPINE, TIBIAL_POSTERIOR_HALF, TIBIAL_POSTERIOR_SPINE[0][1], TIBIAL_POSTERIOR_SPINE[TIBIAL_POSTERIOR_SPINE.length - 1][1]);
  const tibialAntD = linhaVeiaSimples(TIBIAL_ANTERIOR_SPINE, TIBIAL_ANTERIOR_HALF, TIBIAL_ANTERIOR_SPINE[0][1], TIBIAL_ANTERIOR_SPINE[TIBIAL_ANTERIOR_SPINE.length - 1][1]);
  const gastrocD = linhaVeiaSimples(GASTROCNEMICA_SPINE, GASTROCNEMICA_HALF, GASTROCNEMICA_SPINE[0][1], GASTROCNEMICA_SPINE[GASTROCNEMICA_SPINE.length - 1][1]);
  const solearD = linhaVeiaSimples(SOLEAR_SPINE, SOLEAR_HALF, SOLEAR_SPINE[0][1], SOLEAR_SPINE[SOLEAR_SPINE.length - 1][1]);

  // ---- Marcadores de perfurante insuficiente (vista medial, mesma lógica do Esquema de Mapeamento) ----
  const perfMarkers = perfs
    .filter((perf) => perf && perf.status === "pérvia e incompetente" && perf.segmento)
    .map((perf, idx) => {
      const pos = posicaoPerfurante(perf.segmento, perf.valor);
      if (!pos) return null;
      return { x: pos.x - idx * 9, y: pos.y };
    })
    .filter(Boolean);

  const colAnterior = COLS[0], colMedial = COLS[1], colPosterior = COLS[2], colLateral = COLS[3];

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 2000,
      display: "flex", alignItems: "flex-start", justifyContent: "center", overflowY: "auto", padding: "clamp(8px,2vw,24px)",
    }}>
      <div style={{
        background: "#fff", borderRadius: 12, padding: "clamp(12px,2vw,20px)", maxWidth: 1200, width: "100%",
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
          Toque numa veia do desenho para marcar o achado (suficiente, insuficiente, trombose ou recanalização). O laudo abaixo é atualizado em tempo real.
        </p>

        <div style={{ width: "100%", overflowX: "auto", border: "1px solid #dfe6ec", borderRadius: 8, background: "#fbfbfb" }}>
          <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} width="100%" style={{ minWidth: 720, display: "block" }}>
            <Gridlines />
            <Regua mirror={false} />
            <g transform={`translate(${VIEW_W - RULER_WIDTH},0)`}><Regua mirror /></g>

            {/* ANTERIOR: Femoral Comum / Superficial / Profunda */}
            <g transform={`translate(${colAnterior.tx},${VIEW_TY})`}>
              <path d={MEDIAL_SILHOUETTE} fill="#f3d9bb" stroke="#a97a4e" strokeWidth={1.5} />
              <path d={profundaFemD} fill="none" stroke={corStatusProfundo(p["Veia Femoral Profunda"])} strokeWidth={5} strokeLinecap="round" strokeDasharray="2 3" pointerEvents="none" />
              {hitPath(profundaFemD, () => selecionar("profunda", "Veia Femoral Profunda"), "profunda:Veia Femoral Profunda", chaveAtiva)}
              <path d={comumD} fill="none" stroke={corStatusProfundo(p["Veia Femoral Comum"])} strokeWidth={7} strokeLinecap="round" pointerEvents="none" />
              {hitPath(comumD, () => selecionar("profunda", "Veia Femoral Comum"), "profunda:Veia Femoral Comum", chaveAtiva)}
              <path d={superficialD} fill="none" stroke={corStatusProfundo(p["Veia Femoral Superficial"])} strokeWidth={7} strokeLinecap="round" pointerEvents="none" />
              {hitPath(superficialD, () => selecionar("profunda", "Veia Femoral Superficial"), "profunda:Veia Femoral Superficial", chaveAtiva)}
              <text x={195} y={45} fontFamily="monospace" fontSize="9.5" fill="#1a2530">Femoral Comum</text>
              <text x={195} y={130} fontFamily="monospace" fontSize="9.5" fill="#1a2530">Femoral Superficial</text>
              <text x={165} y={68} fontFamily="monospace" fontSize="9.5" fill="#1a2530">Femoral Profunda</text>
            </g>

            {/* MEDIAL: JSF + Safena Magna + marcadores de perfurante */}
            <g transform={`translate(${colMedial.tx},${VIEW_TY})`}>
              <path d={MEDIAL_SILHOUETTE} fill="#f3d9bb" stroke="#a97a4e" strokeWidth={1.5} />
              {magnaResult.segments.map((seg, i) => (
                <path key={i} d={seg.d} fill={seg.tracejado ? "none" : seg.color} stroke={seg.tracejado ? seg.color : "none"} strokeDasharray={seg.tracejado ? "5 5" : undefined} strokeWidth={seg.tracejado ? 2 : undefined} pointerEvents="none" />
              ))}
              {hitPath(magnaHitD, () => selecionar("superficial", "Safena Magna"), "superficial:Safena Magna", chaveAtiva)}
              <circle cx={150} cy={48} r={8} fill={jsfCor} stroke="#fff" strokeWidth={1.5} style={{ cursor: "pointer" }} onClick={() => selecionar("superficial", "JSF")} />
              {perfMarkers.map((mk, i) => (
                <circle key={i} cx={mk.x} cy={mk.y} r={5.5} fill={CORES["pérvia e incompetente"]} stroke="#fff" strokeWidth={1.3} />
              ))}
              <text x={195} y={44} fontFamily="monospace" fontSize="9.5" fill="#1a2530">JSF</text>
              <text x={195} y={130} fontFamily="monospace" fontSize="9.5" fill="#1a2530">VSM</text>
            </g>

            {/* POSTERIOR: JSP + Veia Poplítea + Safena Parva */}
            <g transform={`translate(${colPosterior.tx},${VIEW_TY})`}>
              <path d={POSTERIOR_SILHOUETTE} fill="#f3d9bb" stroke="#a97a4e" strokeWidth={1.5} />
              <path d={POPLITEA_RIBBON} fill={corStatusProfundo(p["Veia Poplítea"])} style={{ cursor: "pointer" }} onClick={() => selecionar("profunda", "Veia Poplítea")} opacity={chaveAtiva === "profunda:Veia Poplítea" ? 0.7 : 1} stroke={chaveAtiva === "profunda:Veia Poplítea" ? "#0eb8d0" : "none"} strokeWidth={2} />
              {parvaResult.segments.map((seg, i) => (
                <path key={i} d={seg.d} fill={seg.tracejado ? "none" : seg.color} stroke={seg.tracejado ? seg.color : "none"} strokeDasharray={seg.tracejado ? "5 5" : undefined} strokeWidth={seg.tracejado ? 2 : undefined} pointerEvents="none" />
              ))}
              {hitPath(parvaHitD, () => selecionar("superficial", "Safena Parva"), "superficial:Safena Parva", chaveAtiva)}
              <circle cx={150} cy={314} r={8} fill={jspCor} stroke="#fff" strokeWidth={1.5} style={{ cursor: "pointer" }} onClick={() => selecionar("superficial", "JSP")} />
              <text x={195} y={310} fontFamily="monospace" fontSize="9.5" fill="#1a2530">JSP</text>
              <text x={195} y={345} fontFamily="monospace" fontSize="9.5" fill="#1a2530">V. Poplítea</text>
              <text x={195} y={430} fontFamily="monospace" fontSize="9.5" fill="#1a2530">VSP</text>
            </g>

            {/* LATERAL: leque de veias profundas da panturrilha */}
            <g transform={`translate(${colLateral.tx},${VIEW_TY})`}>
              <path d={POSTERIOR_SILHOUETTE} fill="#f3d9bb" stroke="#a97a4e" strokeWidth={1.5} />
              <path d={tibialPostD} fill="none" stroke={corStatusProfundo(p["Veias Tibiais posteriores"])} strokeWidth={5} strokeLinecap="round" pointerEvents="none" />
              {hitPath(tibialPostD, () => selecionar("profunda", "Veias Tibiais posteriores"), "profunda:Veias Tibiais posteriores", chaveAtiva)}
              <path d={tibialAntD} fill="none" stroke={corStatusProfundo(p["Veias Tibiais anteriores"])} strokeWidth={5} strokeLinecap="round" pointerEvents="none" />
              {hitPath(tibialAntD, () => selecionar("profunda", "Veias Tibiais anteriores"), "profunda:Veias Tibiais anteriores", chaveAtiva)}
              <path d={gastrocD} fill="none" stroke={corStatusProfundo(p["Veias Gastrocnêmicas"])} strokeWidth={5} strokeLinecap="round" pointerEvents="none" />
              {hitPath(gastrocD, () => selecionar("profunda", "Veias Gastrocnêmicas"), "profunda:Veias Gastrocnêmicas", chaveAtiva)}
              <path d={solearD} fill="none" stroke={corStatusProfundo(p["Veias Soleares"])} strokeWidth={5} strokeLinecap="round" pointerEvents="none" />
              {hitPath(solearD, () => selecionar("profunda", "Veias Soleares"), "profunda:Veias Soleares", chaveAtiva)}
              <text x={185} y={370} fontFamily="monospace" fontSize="9.5" fill="#1a2530">T. Anteriores</text>
              <text x={95} y={420} fontFamily="monospace" fontSize="9.5" fill="#1a2530" textAnchor="end">T. Posteriores</text>
              <text x={95} y={340} fontFamily="monospace" fontSize="9.5" fill="#1a2530" textAnchor="end">Gastrocnêmicas</text>
              <text x={185} y={470} fontFamily="monospace" fontSize="9.5" fill="#1a2530">Soleares</text>
            </g>

            {COLS.map((c) => (
              <text key={c.key} x={c.tx + 150} y={VIEW_H - 14} fontFamily="monospace" fontSize="13" textAnchor="middle" fill="#5c6b78">{c.label}</text>
            ))}
          </svg>
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 4, fontSize: 11, color: "#5c6b78", flexWrap: "wrap" }}>
          <span>🔵 suficiente</span>
          <span>🔴 insuficiente</span>
          <span>⚫ trombose</span>
          <span>🟠 recanalização parcial</span>
          <span>⚪ ausente</span>
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
      </div>
    </div>
  );
}
